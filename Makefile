all: native

native:
	electron-builder
	
win64:
	electron-builder build --windows --x64
