var res = {
	frag1: {
		type: "text",
		src: "./res/shaders/frag.glsl"
	},

	vert1: {
		type: "text",
		src: "./res/shaders/vert.glsl"
	},

	frag2: {
		type: "text",
		src: "./res/shaders/sceneFrag.glsl"
	},

	vert2: {
		type: "text",
		src: "./res/shaders/sceneVert.glsl"
	},

	tex1: {
		type: "image",
		src: "./res/textures/tlmp.png"
	},

	pk: {
		type: "image",
		src: "./res/textures/spritePk.png"
	},

	lmp: {
		type: "image",
		src: "./res/textures/BMB/light2.png"
	},

	tMap: {
		type: "text",
		src: "./res/tilemaps/Level1.json"
	},

	bmb: {
		type: "image",
		src: "./res/textures/BMB/GameSheet.png"
	},

	bitFnt: {
		type: "image",
		src: "./res/textures/BMB/FontSheet.png"
	}
};

var rm = new ResourceManager(res);
var ts = new SpriteSheet();

var gl; //WebGL Context
var canvas; //HTML5 Canvas

var viewMat; //View Matrix

var as; //Screen Aspect Ratio

var tmp; //Main Tilemap
var spr; //Josh Sprite

var fboObk; //Framebuffer

var sth, fboSth; //Shaders

var lt; //Lightmap Texture

var cTime = 0, 
	lTime = 0, 
	dTime = 0;

var kDwn = false;

var cam;

var kbrd;

var fntTex;
var tx;

window.onload = function () {
	rm.getResources(IntiGL);
}

function IntiGL() {
	canvas = document.getElementById('glCan');
		canvas.width = 1024; //window.innerWidth;
		canvas.height = 576; //window.innerHeight;
	gl = canvas.getContext("experimental-webgl", {antialias:true});
	as = (canvas.width/canvas.height); //Screen Aspect Ration

	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	//Create Lightmap Texture
	tx = new Texture();
	tx.makeTexture(gl, gl.NEAREST, res.bmb);

	//Create Sprite Sheet Texture
	lt = new Texture();
	lt.makeTexture(gl, gl.NEAREST, res.lmp);

	fntTex = new Texture();
	fntTex.makeTexture(gl, gl.NEAREST, res.bitFnt);

	//Create FrameBuffer
	fboObk = new Framebuffer();
	fboObk.initFramebuffer(gl, canvas.width, canvas.height);

	//Create Shader
	sth = new Shader();
	sth.setShaders(gl, res.vert1, res.frag1);
	sth.makeProgram(gl);

	//Create FBO Shader
	fboSth = new Shader();
	fboSth.setShaders(gl, res.vert2, res.frag2);
	fboSth.makeProgram(gl);

	//Create Player Sprite
	spr = new Sprite();
	spr.createSprite(2/8*2, 2/8*2, 256, 16, 81);
	spr.initSprite(gl);

	spr.animInit(500, 1, 1, 3);

	mat4.translate(spr.modelMatrix, spr.modelMatrix, [(2/8*5)/as,0.25,0]);

	//Create Tilemap
	tmp = new Tilemap();
	tmp.getTilemapDataFile(res.tMap, res.bmb, 2/8);
	tmp.initTilemap(gl);

	//Create Text
	intText = new Text();
	intText.txt = "Hello LD32";
	intText.initText(14, res.bitFnt, 0.075);

	intText.txtMap.initTilemap(gl);

	mat4.translate(intText.txtMap.spr.modelMatrix, intText.txtMap.spr.modelMatrix, [(2/8*5)/as,0.25,0]);

	//Set Frame Buffer Shader
	gl.useProgram(fboSth.program);

	fboSth.pushAttribute(gl, "inpCr", 2, 4*S_FLOAT, 0); //Adds Vertex Coordinate Attribute
	fboSth.pushAttribute(gl, "texPs", 2, 4*S_FLOAT, 2*S_FLOAT); //Adds Texture Coordinatte Attribute

	fboSth.pushUniform(gl, "tex1"); //FBO Shader Texture Uniform
	fboObk.texture.bindTexture(gl, gl.TEXTURE2, 2, fboSth.uniforms.tex1);

	fboSth.pushUniform(gl, "light");
	lt.bindTexture(gl, gl.TEXTURE1, 1, fboSth.uniforms.light);

	//Set Render Program
	gl.useProgram(sth.program);

	//Get Attributes
	sth.pushAttribute(gl, "inpCr", 2, 6*S_FLOAT, 0); //Vertex Position Attribute
	sth.pushAttribute(gl, "texPs", 2, 6*S_FLOAT, 2*S_FLOAT); //Texture Position Attribute
	sth.pushAttribute(gl, "lmpPs", 2, 6*S_FLOAT, 4*S_FLOAT); //Light Position Attribute

	//Get Uniform Locations
	sth.pushUniform(gl, "proj"); //Projection Uniform
	sth.pushUniform(gl, "model"); //Model Unifrom
	sth.pushUniform(gl, "view"); //Camera Uniform
	sth.pushUniform(gl, "tex"); //Texture Uniform
	sth.pushUniform(gl, "texOff"); //Texture Offset Uniform

	spr.setUniformsLocation(sth.uniforms.model, sth.uniforms.texOff);
	tmp.spr.setUniformsLocation(sth.uniforms.model, sth.uniforms.texOff);
	intText.txtMap.spr.setUniformsLocation(sth.uniforms.model, sth.uniforms.texOff);

	//Create Camera
	cam = new Camera();
	cam.initCamera("ortho", canvas.width, canvas.height);

	cam.position = vec3.fromValues(as, 1.0, 1.0);
	cam.updateView();

	gl.uniformMatrix4fv(sth.uniforms.proj, false, cam.projMatrix); //Set Camera Projection Matrix
	gl.uniformMatrix4fv(sth.uniforms.view, false, cam.viewMatrix); //Set Camera View Matrix

	gl.clearColor(0.0,0.0,0.0,1.0); //Set Clear Color

	kbrd = new Keyboard(); //Keyboard Event Class
	kbrd.addListeners(); //Start Keyboard Listeners

	GetTime(); //Calculate Time

	sth.enableAttributes(gl); //Enable Main Shader Attributes



	/* !!!! Temporary Audio Test !!!! */

	var aud = new Audio();
	aud.src = "./res/sound/tst.wav";
	aud.onloadeddata = function () {
		console.log("Loaded");
		//aud.play();
	}

	// console.log(aud);

	window.requestAnimationFrame(Tick); //Calls Main Loop
}

function Tick(time)
{
	Update();
	Render();

	window.requestAnimationFrame(Tick);
}

function GetTime()
{
	cTime = new Date().getTime();
	dTime = cTime - lTime;
	lTime = cTime;
}

function Update()
{
	var t = (1/4)/36;

	GetTime();

	if (kbrd.keys.D) {
		cam.position[0] += t;
		mat4.translate(spr.modelMatrix,spr.modelMatrix, [t/as,0,0]);

		cam.updateView();
		gl.uniformMatrix4fv(sth.uniforms.view, false, cam.viewMatrix);

		spr.animTick();
	} else if (kbrd.keys.A) {
		cam.position[0] -= t;
		mat4.translate(spr.modelMatrix,spr.modelMatrix, [-t/as,0,0]);

		cam.updateView();
		gl.uniformMatrix4fv(sth.uniforms.view, false, cam.viewMatrix);

		spr.animTick();
	} else {
		spr.offset = 0;
		spr.animTime = spr.animDuration;
	}
}

function Render()
{	
	//Draw Scene To Framebuffer
	gl.bindFramebuffer(gl.FRAMEBUFFER, fboObk.fbo); //Set Render Framebuffer
	gl.clear(gl.COLOR_BUFFER_BIT); //Clear Screen

	//Bind Main Sheet
	tx.bindTexture(gl, gl.TEXTURE0, 0, sth.uniforms.tex);

	//Draw World
	tmp.drawTilemap(gl, sth); //World Draw Calls

	//Draw Player
	spr.drawSprite(gl, sth); //Sprite Draw Calls

	//Bind Font Sheet
	fntTex.bindTexture(gl, gl.TEXTURE0, 0, sth.uniforms.tex);
	//Draw Text
	intText.txtMap.drawTilemap(gl, sth); //World Draw Calls

	gl.bindFramebuffer(gl.FRAMEBUFFER, null); //Remove Render Framebuffer
	sth.disableAttributes(gl); //Disable Shader Attributes

	//Set Framebuffer To Main and clear it
	gl.viewport(0,0,canvas.width,canvas.height); //Set Rendering Target
	gl.clear(gl.COLOR_BUFFER_BIT); //Clear Screen

	gl.useProgram(fboSth.program); //Set Shader Program

	//Render Framebuffer
	fboObk.bindBuffers(gl); //Binds Object Buffers
	fboSth.enableAttributes(gl); //Enabe FBO Shader Attributes
	fboSth.updateAttributes(gl); //Updates FBO Shader Attributes

	fboObk.drawFBO(gl); //Framebuffer Draw Calls

	fboSth.disableAttributes(gl); // Disabe FBO Shader Attributes
	gl.useProgram(sth.program); // Set Main Program
	sth.enableAttributes(gl); //Enable Main Program Attributes
}