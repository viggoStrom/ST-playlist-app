
const startTimes = document.querySelectorAll('row input[type="number"]');
const timeDisplays = document.querySelectorAll('row p');
const modifiers = document.querySelectorAll('modifiers');
const fileInputs = document.querySelectorAll('input[type="file"]');
const formattedTimes = [];

const updateTimeInputs = () => {
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

const updateFormattedTimes = () => {
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

const updateModifierStates = (object) => {
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
    updateTimeInputs()
    updateFormattedTimes()
}

// Event listeners for updating all the states
startTimes.forEach(startTime => {
    startTime.addEventListener("input", () => {
        update()
    })
})
fileInputs.forEach(fileInput => {
    fileInput.addEventListener("input", () => {
        update()
    })
})
modifiers.forEach(modifier => {
    modifier.children[2].addEventListener("click", () => {
        updateModifierStates(modifier.children[2])
    })
    modifier.children[5].addEventListener("click", () => {
        updateModifierStates(modifier.children[5])
    })
    modifier.children[8].addEventListener("click", () => {
        updateModifierStates(modifier.children[8])
    })
    modifier.addEventListener("change", () => {
        update()
    })
})

const linter = (data) => {
    const date = data.date
    const rows = data.rows

    let returnString = "Some potential issues were found:"

    if (date.length !== 10) {
        const dateDOM = document.getElementById("dateInput")
        dateDOM.style.border = ".1rem solid red"
        const listener = dateDOM.addEventListener("change", () => {
            dateDOM.style.border = ""
            dateDOM.removeEventListener("change", listener)
        })
        returnString += " Date must be in the format YYYY-MM-DD."
    }

    let pauses = 0
    let missingTime = 0

    rows.forEach((row, index) => {
        const time = row.time
        const path = row.path
        const pause = row.pause
        const alert = row.alert
        const extend = row.extend

        // Check for times that overlap
        const nextTime = rows[index + 1] ? rows[index + 1].time : Infinity
        if (
            parseInt(time[0]) + parseInt(time[1]) * 60 > parseInt(nextTime[0]) + parseInt(nextTime[1]) * 60
        ) {
            timeDisplays[index].style.border = ".1rem solid red"
            timeDisplays[index + 1].style.border = ".1rem solid red"
            const listener = timeDisplays[index].addEventListener("input", () => {
                timeDisplays[index].style.border = ""
                timeDisplays[index].removeEventListener("input", listener)
            })
            const listener2 = timeDisplays[index + 1].addEventListener("input", () => {
                timeDisplays[index + 1].style.border = ""
                timeDisplays[index + 1].removeEventListener("input", listener2)
            })
            returnString += ` Row ${index + 1} starts after row ${index + 2}.`
        }

        // Simply counts pauses
        if (pause) {
            pauses++
        }

        // Check for gaps in the video files 
        if (
            (index === 0 && path === "")
            ||
            (index !== 0 && path === "" && rows[index - 1].path !== "" && rows[index + 1].path !== "")
        ) {
            fileInputs[index].style.border = ".1rem solid red"
            const listener = fileInputs[index].addEventListener("input", () => {
                fileInputs[index].style.border = ""
                fileInputs[index].removeEventListener("input", listener)
            })
            returnString += ` Row ${index + 1} is missing a file.`
        }

        // Checks for missing start times in cases where there probably should be one
        if (
            path !== ""
            &&
            startTimes[index].value === ""
            &&
            startTimes[index].disabled === false
        ) {
            startTimes[index].style.border = ".1rem solid red"
            const listener = startTimes[index].addEventListener("input", () => {
                startTimes[index].style.border = ""
                startTimes[index].removeEventListener("input", listener)
            })
            missingTime++
        }
    })

    if (pauses === 0) {
        returnString += " No pauses were added."
    }
    if (missingTime !== 0) {
        returnString += " A start time is missing."
    }

    if (returnString === "Some potential issues were found:") {
        return undefined
    } else {
        return returnString
    }
}

const exportButton = async (overwrite) => {
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
                exportButton(true)
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


// Auto saving
const saveConfig = () => {
    const save = {
        date: document.getElementById("dateInput").value,
        startTimes: [...startTimes].map(startTime => startTime.value),
        modifiers: [...modifiers].map(modifier => [
            modifier.children[2].checked,
            modifier.children[5].checked,
            modifier.children[8].checked
        ]),
        fileInputs: [...fileInputs].map(fileInput => fileInput.files[0] ? fileInput.files[0].path : "")
    }
    localStorage.setItem("save", JSON.stringify(save))
}
const loadConfig = () => {
    if (localStorage.getItem("save")) {
        const save = JSON.parse(localStorage.getItem("save"))

        document.getElementById("dateInput").value = save.date

        save.startTimes.forEach((startTime, index) => {
            startTimes[index].value = startTime
        })

        save.modifiers.forEach((modifier, index) => {
            modifiers[index].children[2].checked = modifier[0]
            modifiers[index].children[5].checked = modifier[1]
            modifiers[index].children[8].checked = modifier[2]
        })

        save.fileInputs.forEach((fileInput, index) => {
            if (fileInput) {
                fileInputs[index].files[0] = fileInput
            }
        })

        update()
    }
}
const saveEvent = setInterval(saveConfig, 500)
window.onload = () => {
    loadConfig()
}
window.onbeforeunload = () => {
    clearInterval(saveEvent)
    saveConfig()
}