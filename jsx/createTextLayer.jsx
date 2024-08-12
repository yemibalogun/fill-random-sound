var proj = app.project;
if (!proj) {
    proj = app.newProject();
}

var comp;
if (proj.activeItem && proj.activeItem instanceof CompItem) {
    comp = proj.activeItem;
} else {
    comp = proj.items.addComp("TextComp", 1920, 1080, 1, 10, 30);
}

var folderName = "YourFolderName";  // Replace with the actual folder name
var textLayer = comp.layers.addText(folderName);

var textProp = textLayer.property("Source Text");
var textDocument = textProp.value;

textDocument.resetCharStyle();
textDocument.resetParagraphStyle();
textDocument.fontSize = 100;
textDocument.text = folderName;
textDocument.justification = ParagraphJustification.CENTER_JUSTIFY;

textProp.setValue(textDocument);

textLayer.position.setValue([comp.width / 2, comp.height / 2]);

var renderQueueItem = proj.renderQueue.items.add(comp);
var outputModule = renderQueueItem.outputModule(1);
outputModule.file = new File("~/Desktop/TextComp.mov");
outputModule.applyTemplate("Lossless with Alpha");

proj.renderQueue.queueInAME(false);

outputModule.file.fsName;
