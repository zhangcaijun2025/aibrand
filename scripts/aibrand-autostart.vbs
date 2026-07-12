' AiBrand Studio - Boot Auto-Start (Silent Launcher)
' Placed in Windows Startup folder to launch the full stack at login
' Invokes aibrand-startup.bat which calls aibrand-startup.ps1
' Version: 2026-07-12 v2 (handles lock-skip gracefully, 8 min timeout)

Option Explicit
Dim WshShell, fso, batPath, errorFile, lockFile, errorText, exec, waited, maxWait

batPath = "D:\king2046\scripts\aibrand-startup.bat"
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Run the startup batch file (hidden, with extended timeout)
' WindowStyle=0 (hidden), bWaitOnReturn=True
WshShell.Run "cmd /c """ & batPath & """", 0, True

' Check for startup errors written by the PowerShell script
errorFile = WshShell.ExpandEnvironmentStrings("%USERPROFILE%") & "\.aibrand\startup.error"
lockFile  = WshShell.ExpandEnvironmentStrings("%USERPROFILE%") & "\.aibrand\startup.lock"

If fso.FileExists(errorFile) Then
    On Error Resume Next
    errorText = fso.OpenTextFile(errorFile, 1).ReadAll()
    If Len(errorText) > 0 Then
        MsgBox "AiBrand Auto-Start Errors Detected:" & vbCrLf & vbCrLf & errorText & vbCrLf & _
               "Check full log: %USERPROFILE%\.aibrand\startup.log" & vbCrLf & vbCrLf & _
               "Manual recovery: cd D:\king2046 && docker compose up -d", vbExclamation, "AiBrand Startup"
    End If
    fso.DeleteFile errorFile, True
    On Error GoTo 0
End If

' Clean up stale lock file if it exists (script removes its own on success)
If fso.FileExists(lockFile) Then
    On Error Resume Next
    fso.DeleteFile lockFile, True
    On Error GoTo 0
End If

Set fso = Nothing
Set WshShell = Nothing
