# SETTING UP PREMIERE PRO PANEL

1.	Extract the Process-Premiere folder.
2.	Enable loading of unsigned panels. 
On MacOS, type the following into Terminal, then relaunch Finder (either via rebooting, or from the Force Quit dialog):
defaults write /Users/<username>/Library/Preferences/com.adobe.CSXS.11.plist PlayerDebugMode 1


On Windows, make the following registry entry (a new Key, of type String):
 

3. Put panel into extensions directory
Put extracted Premiere-Process folder here, to have Premiere Pro load it:
Windows:    C:\Program Files (x86)\Common Files\Adobe\CEP\extensions

Mac:        /Library/Application Support/Adobe/CEP/extensions
Note: That's the root /Library, not a specific user's ~/Library...

Open Adobe Premiere Pro application, click Window and navigate to Extensions. Your panel should now be loaded there.

# Overview 
The code is a JavaScript script that provides a set of utility functions for automating tasks in Adobe Premiere Pro. The script is organized into several sections, each with its own set of functions that perform specific tasks.

## Utility Functions

serialize
Serializes an object into a string representation.

## Parameters:
obj: The object to serialize.
Returns: A string representation of the object.
### saveProject
Saves the current project.

### importFiles
Imports files through a dialog.

### findOrCreateMainFolder
Finds or creates the "Main folder" in the project.

### importFolderStructure
Imports a folder structure into the project.

### deleteFolderContents
Deletes the contents of a folder.

### importFolder
Imports a folder into the project.

### importFilesInSubFolder
Imports files in a subfolder.

### processImportedFolders
Processes the imported folders.

### updateTextInGraphic
Updates the text in a graphic layer.

### importMoGRT
Imports a MoGRT file.

### processFirstFrame
Processes the first frame of a video.

### processLastFrame
Processes the last frame of a video.

### processSequence
Processes a sequence.

### processVideo
Processes a video.

### findFileInBin
Finds a file in a bin.

### replaceFileInSequence
Replaces a file in a sequence.

### replaceVideoInSequenceFirstTrack
Replaces a video in the first track of a sequence.

### replaceVideoInSequenceSecondTrack
Replaces a video in the second track of a sequence.

### replaceVideoInSequenceThirdTrack
Replaces a video in the third track of a sequence.

### findSequenceByName
Finds a sequence by name.

### saveSequenceToReadyForExport
Saves a sequence to a ready-for-export state.

### findBinIndex
Finds the index of a bin.

### renderActiveSeq
Renders the active sequence.

### updateEventPanel
Updates the event panel with a message.

## Code Organization 
The code is organized into several sections, each with its own set of functions that perform specific tasks. The sections are:

•	Utility functions
•	Folder management functions
•	File import and processing functions
•	Sequence processing functions
•	Graphic layer processing functions
•	MoGRT import function
•	Video processing functions
•	Bin management functions
•	Sequence export function
•	Event panel update function

## Code Style
The code follows a consistent style throughout, with each function having a clear and descriptive name. The code is well-commented, with comments explaining the purpose of each function and its parameters. The code also uses whitespace effectively to make it easy to read.

## Error Handling 
The code includes error handling mechanisms to catch and handle errors that may occur during execution. For example, the importFiles function checks if the fileOrFilesToImport parameter is null or undefined before attempting to import the files.

## Performance 
The code is optimized for performance, with functions that perform complex tasks broken down into smaller, more manageable pieces. This helps to reduce the risk of performance issues and makes the code more maintainable.

I hope this documentation helps! Let me know if you have any further questions, feel free to reach us at yemibalogun2006@gmail.com
