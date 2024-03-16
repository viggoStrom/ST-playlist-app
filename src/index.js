const { app, BrowserWindow, dialog, ipcMain, Notification } = require('electron');
// const { download } = require('electron-dl');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    });
    mainWindow.maximize()

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();

    mainWindow.on("close", (event) => {
        event.preventDefault();
    
        const choice = dialog.showMessageBoxSync({
            type: 'question',
            buttons: ['Yes', 'No'],
            title: 'Confirm',
            message: 'Are you sure you want to quit?',
            defaultId: 1,
            cancelId: 1,
            noLink: true
        });
        const shouldQuit = (choice === 0); // "Yes" is the first button, so it returns 0
        if (shouldQuit) {
            mainWindow.destroy()
        }
    })
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    ipcMain.handle('dialog:saveFile', main)
    createWindow()
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});


// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

const fs = require('fs');

const createPS1 = (rows) => {
    const args = " '--one-instance' '--qt-continue=0' '--fullscreen' '--qt-fullscreen-screennumber=1' '--embedded-video' '--no-video-title-show' '--qt-notification=0' '--no-qt-updates-notif' '--no-qt-recentplay' '--deinterlace=0' '--sub-language=swe,eng,any' '--qt-notification=0' '--no-qt-name-in-title' '--qt-auto-raise=0' '--no-qt-fs-controller' '--no-random' '--no-loop' '--no-repeat' '--no-play-and-pause'"
    const enqueueArg = " '--playlist-enqueue'"
    const launchCommand = "& 'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe'"
    const pauseCommand = launchCommand + " '\\pauses\\Pause.mp4'" + args
    const countdownCommand = launchCommand + " '\\pauses\\1 min loop with Countdown.mp4'" + args
    const alertCommand = launchCommand + " '\\pauses\\1 min Emergency Procedures.mp4'" + args
    const delayCommand = "Start-Sleep -Milliseconds 100\n\n"

    const waitUntil = (hour, minute) => {
        return `$desiredTime = Get-Date -Hour ${hour} -Minute ${minute} -Second 0\nwhile ((Get-Date) -lt $desiredTime) {\nStart-Sleep -Seconds 1\n}\n\n`
    }

    let body = ""
    rows.forEach((row, index) => {
        const time = row.time // can be "disabled" or [hour, minute]
        const path = row.path
        const pause = row.pause
        const extend = row.extend
        let alert
        try {
            alert = rows[index - 1].alert
        } catch (error) {
            alert = false
        }

        if (time !== "disabled") { // If time is disabled, it's a pause
            let minutes = parseInt(time[0]) * 60 + parseInt(time[1]) - 1 // minus one for the countdown
            if (alert) {
                minutes -= 1
            }
            const hour = Math.floor(minutes / 60)
            const minute = minutes % 60

            body += waitUntil(hour, minute)
            body += countdownCommand + "\n\n"
            body += delayCommand
            if (alert) {
                body += alertCommand + enqueueArg + "\n\n"
                body += delayCommand
            }
        }
        const name = path.split("\\").pop()
        const sanitizedName = name
            .replace(/'/g, "''")
            .replace(/"/g, '""')
            .replace(/`/g, '``')
            .replace(/\$/g, '`$')
            .replace(/#/g, '`#');
        body += "Write-Host 'Now playing " + sanitizedName + "'\n";
        body += launchCommand + " '\\videos\\" + sanitizedName + "'" + args + enqueueArg + "\n\n"
        body += delayCommand

        if (pause) {
            body += pauseCommand + enqueueArg + "\n\n"
            body += delayCommand
        }
        if (extend) {
            body += pauseCommand + enqueueArg + "\n\n"
            body += delayCommand
        }
    })

    return `Write-Host 'Playlist has started. You can leave the computer unattended now :)'\nWrite-Host 'Playing the initial pause. It is 2h long so keep that in mind if starting the playlist early.'\n\n${pauseCommand}\n\n${delayCommand}\n\n${body}# Enqueues a pause at the end so it doesn\'t abruptly end at the last episode\n${pauseCommand + enqueueArg}\n\nRead-Host 'Playlist has ended. Feel free to close everything down and shutdown the computer. Press enter to close this window'\n\n`
}

const main = async (event, dataRaw) => {

    // Get save location from user
    const saveFolderPath = await dialog.showOpenDialog({ title: "Choose save location", buttonLabel: "Save playlist folder here", properties: ["openDirectory"] })
    if (saveFolderPath.canceled) {
        return "Canceled"
    }

    // Parse data from GUI
    const data = JSON.parse(dataRaw)
    data.rows = data.rows.filter(row => row.path !== "")
    console.log(data);

    if (data.rows.length === 0) {
        return "Error - No videos added"
    }
    if (data.date === "") {
        return "Error - No date specified"
    }

    // Destination folder path
    const destPath = saveFolderPath.filePaths[0] + "/" + data.date.replace(/[^0-9-]/g, "")

    if (fs.existsSync(destPath)) {
        const response = await dialog.showMessageBox({
            title: "Warning",
            message: "Folder already exists",
            type: "warning",
            buttons: ["Overwrite", "Cancel"],
            defaultId: 1,
            cancelId: 1,
            noLink: true
        })
        if (response.response === 1) {
            return "Error - Folder already exists"
        }
    }

    // Make folder structure
    fs.rmSync(destPath, { recursive: true, force: true, maxRetries: 10 })
    fs.mkdirSync(destPath + "/pauses", { recursive: true })
    fs.mkdirSync(destPath + "/videos", { recursive: true })

    // Make PowerShell script
    fs.writeFileSync(destPath + "/play.ps1", createPS1(data.rows), { flag: 'w' })

    // Copy videos
    for (row of data.rows) {
        try {
            const path = row.path

            fs.copyFileSync(path, destPath + "/videos/" + path.split("\\").pop())
        } catch (error) {
            console.error(error)
            return "Canceled - Folder already exists"
        }
    }

    // Copy pauses
    // TODO Switch these for distribution cuz electron :/
    const pausePath = "src/templateAssets/"
    // const pausePath = "resources/app/src/templateAssets/"
    fs.copyFileSync(pausePath + "Pause.mp4", destPath + "/pauses/Pause.mp4")
    fs.copyFileSync(pausePath + "1 min Emergency Procedures.mp4", destPath + "/pauses/1 min Emergency Procedures.mp4")
    fs.copyFileSync(pausePath + "1 min loop with Countdown.mp4", destPath + "/pauses/1 min loop with Countdown.mp4")


    // Notify user
    const notification = new Notification({
        title: "Export complete",
        body: "Playlist and videos are saved at " + destPath,
        sound: "Ping"
    })
    notification.show()

    return "Finnished Successfully"
}

