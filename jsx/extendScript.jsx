
$.runScript = {
	// Utility function to serialize objects into string representations
	serialize: function (obj) {
		var str = '';
		for (var key in obj) {
			if (obj.hasOwnProperty(key)) {
				var value = obj[key];
				if (value && typeof value === 'object') {
					str += key + ': ' + this.serialize(value) + ', ';
				} else {
					str += key + ': ' + value + ', ';
				}
			}
		}
		return str.slice(0, -2); // Remove the last comma and space
	},

	// Function to save the current project
	saveProject: function () {
		app.project.save();
	},
	
	insertAudioFromBinToRandomPosition: function(sequence, selectedBin, inPoint, outPoint) {
		$.writeln('Starting insertAudioFromBinToRandomPosition function');
		
		var audioTracks = sequence.audioTracks;
		var targetAudioTrack = audioTracks[1]; // Assuming you want to insert into the second audio track
	
		// Check if the target audio track exists
		if (!targetAudioTrack) {
			var message = 'Error: Target audio track does not exist.';
			$.writeln(message);
			this.updateEventPanel(message); // Send error message to event panel
			return;
		}

		// Get the items in the selected bin (audio files)
		var binItems = selectedBin.children;
		if (!binItems || binItems.numItems === 0) {
			var message = 'Error: No items found in the selected bin.'
			$.writeln(message);
			this.updateEventPanel(message) // Send error message to event panel
			return;
		}

		// Ensure inPoint and outPoint are valid
		if (typeof inPoint !== 'number'  || typeof outPoint !== 'number' || inPoint >= outPoint) {
			var message = 'Error: Invalid in and out points.';
			$.writeln(message);
			this.updateEventPanel(message) // Send error message to event panel
			return;
		}

		// Iterate through each item in the bin
		for (var i = 0; i < binItems.numItems; i++) {
			var item = binItems[i];

			// Check if the item is a valid audio file
			if (item.type === ProjectItemType.CLIP && item.mediaType === 'Audio') {
				// Generate a random time betweeen inPoint and outPoint
				var randomTime = inPoint + (Math.random() * (outPoint - inPoint));
				$.writeln('Inserting audio clip at random time: ' + randomTime);

				// Insert the audio clip into the target audio track at the random time
				try {
					targetAudioTrack.insertClip(item, randomTime);
					$.writeln('Audio clip inserted successfully at: ' + randomTime);
				
				} catch (e) {
					var message = 'Error inserting audio clip: ' + e.name + ' - ' + e.message;
					$.writeln(message);
					this.updateEventPanel(message);  // Send error message to event panel
				}
			} else {
				$.writeln('Skipping non-audio item: ' + item.name);
			}		 
		}

		var completionMessage = 'Finished inserting audio clips.';
		$.writeln(completionMessage);
		this.updateEventPanel(completionMessage); // Notify user of successful completion
	},
		
	updateEventPanel : function (message) {
		app.setSDKEventMessage(message, 'info');
		/*app.setSDKEventMessage('Here is some information.', 'info');
		app.setSDKEventMessage('Here is a warning.', 'warning');
		app.setSDKEventMessage('Here is an error.', 'error');  // Very annoying; use sparingly.*/
	},

}	