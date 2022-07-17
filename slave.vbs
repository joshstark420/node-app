Dim VMPath 
Dim VMXPath 
Dim PartID 
Dim objShell
Dim filesys
Dim filetxt



'Path to your VISUAL executable file – VM.EXE
VMPath = "C:\Infor\VISUAL\VISUAL MFG\VM.exe"

'Path to where you want to create your VMX file. You would typlically want
'this to be in your VISUAL local directory
VMXPath = "C:\Infor\VISUAL\VISUAL MFG\VISUAL.VMX"

set objShell = CreateObject("WScript.shell")


'Create the VMX file to open VISUAL Material Planning Window
Set filesys = CreateObject("Scripting.FileSystemObject")
Set filetxt = filesys.CreateTextFile(VMXPath, True)
filetxt.WriteLine ("LSASTART")
filetxt.WriteLine ("VMESTWIN~" & "0135")
filetxt.Close

'Drilldown into VISUAL using VMX file
' objShell.Exec( """C:\Infor\VISUAL\VISUAL MFG\VM.exe""" & """C:\Infor\VISUAL\VISUAL MFG\VISUAL.VMX""" )
objShell.Exec ("""" & VMPath & """ & """ & VMXPath & """" ) 


'objShell.AppActivate ("Material Planning Window – Infor VISUAL")

'Focus back to Excel


