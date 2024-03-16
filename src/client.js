
const startTimes = document.querySelectorAll('row input[type="number"]');
const timeDisplays = document.querySelectorAll('row p');
const modifiers = document.querySelectorAll('modifiers');
const fileInputs = document.querySelectorAll('input[type="file"]');
const formattedTimes = [];

const updateStartTimes = () => {
    startTimes.forEach((startTime, index) => {
        try {
            if (
                (
                    startTimes[index - 1].value
                    ||
                    startTimes[index - 1].placeholder === "Plays after previous"
                )
                &&
                modifiers[index - 1].children[2].checked === false
            ) {
                startTime.placeholder = "Plays after previous"
                startTime.disabled = true
            } else {
                startTime.placeholder = "hhmm"
                startTime.disabled = false
            }
        } catch (error) { }
    })
}

const updateTimePreviews = () => {
    startTimes.forEach((startTime, index) => {
        const time = startTime.value
        const timeDisplay = timeDisplays[index]
        let formattedTime = ""

        if (time.length === 4) {
            formattedTime = `${(time.slice(0, 2) % 24).toString().padStart(2, "0")}:${(time.slice(2) % 60).toString().padStart(2, '0')}`
        }
        else if (time.length === 3) {
            formattedTime = `${(time.slice(0, 2) % 24).toString().padStart(2, "0")}:${(time.slice(2, 4) % 60).toString().padEnd(2, '0')}`
        }
        else if (time.length === 2) {
            formattedTime = `${(time % 24).toString().padStart(2, "0")}:00`
        }
        else if (time.length === 1) {
            formattedTime = `0${time}:00`
        }
        else if (time.length === 0) {
            formattedTime = "--:--"
        }
        else {
            formattedTime = `${time.slice(0, 2) % 24}:${time.slice(2, 4) % 60}`
        }

        formattedTimes[index] = formattedTime
        timeDisplay.innerText = formattedTime
    })
}

// Gets added as onclick in the HTML
const updateModifiers = (object) => {
    const pause = object.parentElement.children[2]
    const alert = object.parentElement.children[5]
    const extend = object.parentElement.children[8]

    if (object.id === "alertCheckbox") {
        if (pause.checked === false && alert.checked === true) {
            pause.checked = true
        }
    }
    else if (object.id === "extendCheckbox") {
        if (pause.checked === false && extend.checked === true) {
            pause.checked = true
        }
    }
    else if (object.id === "pauseCheckbox") {
        if (pause.checked === false && alert.checked === true) {
            alert.checked = false
        }
        if (pause.checked === false && extend.checked === true) {
            extend.checked = false
        }
    }

    if (pause.checked) {
        object.parentElement.style.animation = "expand .1s ease-in-out"
        object.parentElement.style.height = "3rem"
    } else {
        object.parentElement.style.animation = "collapse .1s ease-in-out"
        object.parentElement.style.height = "1.5rem"
    }
}

const update = () => {
    updateStartTimes()
    updateTimePreviews()
}

startTimes.forEach(startTime => {
    startTime.addEventListener("input", () => {
        update()
    })
})

modifiers.forEach(modifier => {
    modifier.addEventListener("change", () => {
        update()
    })
})

const linter = (data) => {
    const date = data.date
    const rows = data.rows

    if (date.length !== 10) {
        const dateDOM = document.getElementById("dateInput")
        dateDOM.style.border = ".1rem solid red"
        dateDOM.addEventListener("change", () => {
            dateDOM.style.border = ""
        })
        return "Date must be in the format YYYY-MM-DD"
    }

    const pathList = []
    let pauses = 0
    let times = 0

    rows.forEach((row, index) => {
        const time = row.time
        const path = row.path
        const pause = row.pause
        const alert = row.alert
        const extend = row.extend

        pathList.push(path)
        if (pause) {
            pauses++
        }
        if (path !== "" && time === "") {
            times++
        }
    })

    const hasPathGap = pathList.some((path, index) => {
        if (
            (index === 0 && path === "")
            ||
            (index !== 0 && path === "" && pathList[index - 1] !== "" && pathList[index + 1] !== "")
        ) {
            fileInputs[index].style.border = ".1rem solid red"
            fileInputs[index].addEventListener("input", () => {
                fileInputs[index].style.border = ""
            })
            return true;
        } else {
            return false;
        }
    });
    if (hasPathGap) {
        return "Did you miss adding a video? There is a gap the list of videos."
    }
    if (pauses === 0) {
        return "Did you miss inserting pauses?"
    }
    if (times === 0) {
        return "Did you miss inserting times?"
    }

    return undefined
}

const exportPlaylist = async (overwrite) => {

    const rows = []

    document.querySelectorAll("row").forEach((row, index) => {
        const time = row.children[1].innerHTML.split(":")[0] === "--" ? "disabled" : row.children[1].innerHTML.split(":")
        const path = row.children[2].files[0] ? row.children[2].files[0].path : ""
        localModifiers = modifiers[index] ? modifiers[index].children : undefined

        const data = {
            time: time,
            path: path,
            pause: localModifiers === undefined ? undefined : localModifiers[2].checked,
            alert: localModifiers === undefined ? undefined : localModifiers[5].checked,
            extend: localModifiers === undefined ? undefined : localModifiers[8].checked,
        }

        rows.push(data)
    })

    const data = {
        date: document.getElementById("dateInput").value.replace(/[^0-9-]/g, ""),
        rows: rows,
    }

    const status = document.querySelector("export status")

    if (!overwrite) {
        status.innerText = "Checking for mistakes"

        const lintResult = linter(data)

        if (lintResult !== undefined) {
            status.innerText = lintResult
            const overwrite = document.createElement("button")
            overwrite.innerText = "Overwrite"
            overwrite.id = "overwriteButton"
            overwrite.onclick = () => {
                exportPlaylist(true)
            }
            status.appendChild(overwrite)
            return
        }
    }

    status.innerText = "(This might take a while) Exporting"
    status.title = "This might take a while if you're writing to a slow drive. The program will freeze while exporting. Don't worry, it's not stuck. Just wait."

    const dots = setInterval(() => {
        status.innerText += "."
    }, 1000);

    const response = await window.electronAPI.saveFile(JSON.stringify(data))

    clearInterval(dots)

    status.innerText = response
    status.title = ""
}

// Dummy protection
window.addEventListener("keydown", (event) => {
    if (
        event.key === "F5"
        ||
        (event.ctrlKey && event.key === "r")
    ) {
        event.preventDefault()
    }
})