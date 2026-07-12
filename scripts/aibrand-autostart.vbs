' AiBrand Studio - Boot Auto-Start (Silent Launcher)
' Placed in Windows Startup folder to launch the full stack at login
' Invokes aibrand-startup.bat which calls aibrand-startup.ps1
' Version: 2026-07-12 (hardened: waits for completion, shows error popups)
Option Explicit
Dim WshShell, fso, batPath, errorFile, errorText

batPath = "D:\king2046\scripts\aibrand-startup.bat"
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Run with 5-minute timeout, wait for completion before continuing
' WindowStyle=0 (hidden), bWaitOnReturn=True
WshShell.Run "cmd /c """ & batPath & """", 0, True

' Check for startup errors written by the PowerShell script
errorFile = WshShell.ExpandEnvironmentStrings("%USERPROFILE%") & "\.aibrand\startup.error"
If fso.FileExists(errorFile) Then
    On Error Resume Next
    errorText = fso.OpenTextFile(errorFile, 1).ReadAll()
    If Len(errorText) > 0 Then
        MsgBox "AiBrand Startup Errors:" & vbCrLf & vbCrLf & errorText & vbCrLf & _
               "Check startup log: %USERPROFILE%\.aibrand\startup.log", vbExclamation, "AiBrand Startup"
    End If
    fso.DeleteFile errorFile, True
    On Error GoTo 0
End If

Set fso = Nothing
Set WshShell = Nothing
