
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
        if (extend.checked === true && pause.checked === false) {
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

const exportPlaylist = async () => {

    const rows = []

    document.querySelectorAll("row").forEach((row, index) => {
        const time = row.children[1].innerHTML.split(":")[0] === "--" ? "disabled" : row.children[1].innerHTML.split(":")
        const path = row.children[2].files[0] ? row.children[2].files[0].path : ""
        localModifiers = modifiers[index] ? modifiers[index].children : undefined

        const data = {
            time: time,
            path: path,
            pause: localModifiers === undefined ? undefined : localModifiers[2].checked,
            alert: localModifiers === undefined ? undefined : localModifiers[5].checked
        }

        rows.push(data)
    })

    const data = {
        date: document.getElementById("dateInput").value.replace(/[^0-9-]/g, ""),
        rows: rows,
    }

    const status = document.querySelector("export status")
    status.innerText = "(This might take a while) Exporting"
    status.title = "This might take a while because if you're writing to a slow drive. The program will freeze while exporting. Don't worry, it's not stuck. Just wait."

    const dots = setInterval(() => {
        status.innerText += "."
    }, 1000);

    const response = await window.electronAPI.saveFile(JSON.stringify(data))

    clearInterval(dots)
    if (response === "Success") {
        status.innerText = "Finnished Successfully"
    } else if (response === "Cancelled") {
        status.innerText = "Cancelled"
    } else {
        status.innerText = response
    }
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