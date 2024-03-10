


& 'C:\Program Files\VideoLAN\VLC\vlc.exe' '.\video\Pause.mp4' '--fullscreen' '--no-video-title-show'

$desiredTime = Get-Date -Hour 8 -Minute 31 -Second 30
while ((Get-Date) -lt $desiredTime) {
    Start-Sleep -Seconds 1
}

& 'C:\Program Files\VideoLAN\VLC\vlc.exe' '.\video\Star Trek DS9 S06E14 - One Little Ship.mkv' '--fullscreen' '--no-video-title-show'

& 'C:\Program Files\VideoLAN\VLC\vlc.exe' '.\video\Star Trek TAS S02E01 - The Pirates of Orion.mkv' '--fullscreen' '--no-video-title-show' '--playlist-enqueue'

