$(document).ready(function(){
  nameCanvas = $('#nameCanvas');
  canvasContext = document.getElementById('nameCanvas').getContext('2d');
  colourMode = false;
  targetColour = new Colour(147,112,219);
  colToUse = new Colour(120, 180, 222);
  baseColour = new Colour(150, 200, 230);
  lastX = -1; // Last hit coords
  lastY = -1;
  animators = Array();
  grid = new Grid(17, 16);
  grid.initialise();

  nameCanvas.mousemove( function(e) {
      var x = e.pageX - $(this).offset().left;
      var y = e.pageY - $(this).offset().top;

      x = Math.floor(x / grid.totalBlockWidth);
      y = Math.floor(y / grid.totalBlockWidth);

      // Check we're not out of bounds
      if (x > (grid.cols - 1) || y > (grid.rows -1)) return;
      if (x < 0 || y < 0) return;

      if (lastX != x || lastY != y){
        grid.blocks[y][x].hit();
        lastX = x;
        lastY = y;
      }
  });

  nameCanvas.click(function(e) {
      var x = e.pageX - $(this).offset().left;
      var y = e.pageY - $(this).offset().top;
      x = Math.floor(x / grid.totalBlockWidth);
      y = Math.floor(y / grid.totalBlockWidth);

      // Check we're not out of bounds
      if (x > (grid.cols - 1) || y > (grid.rows -1)) return;
      if (x < 0 || y < 0) return;

      if (x % 3 == 0 && y % 5 == 0) { //some fun
        autoAdd(50);
      }
      else if (x == 0 && y == 16) { // bottom left changes colour mode
        colourMode = !colourMode
      }
      grid.blocks[y][x].hit();
  });

  $(document).keypress( function(e) {
    if (e.which == 13 && message != '')  {
      messageAnimation = new StartMessage(message);
      animators.push(messageAnimation);
      message = '';
      return;
    }

    if (typeof messageAnimation != 'undefined') {
      messageAnimation.stop();
      delete messageAnimation;
    }

    renderLetter(String.fromCharCode(e.which));
    message += String.fromCharCode(e.which);
  });

  animators.push(new StartMessage('Welcome'));
  t = setInterval('tick()', 30);
});


/* Colour */
function Colour(r, g, b) {
  this.r = r;
  this.g = g;
  this.b = b;
}

Colour.prototype.copy = function(other) {
  this.r = other.r;

  this.g = other.g;
  this.b = other.b;
}

Colour.prototype.equals = function(other) {
  return ((this.r === other.r) && (this.g === other.g) && (this.b === other.b));
}

Colour.prototype.add = function(n) {
  this.r = Math.min(255, this.r + n);
  this.g = Math.min(255, this.g + n);
  this.b = Math.min(255, this.b + n);
}

Colour.prototype.toRgba = function(alpha) {
  return 'rgba(' + this.r + ', ' + this.g + ', ' + this.b + ', ' + alpha + ')';
}

Colour.prototype.stepTowardsColour = function(other) {
  if (this.r < other.r) this.r++;
  else if (this.r > other.r) this.r--;

  if (this.g < other.g) this.g++;
  else if (this.g > other.g) this.g--;

  if (this.b < other.b) this.b++;
  else if (this.b > other.b) this.b--;
}

/* Block */
function Block(context, x, y) {
  this.x = x;
  this.y = y;
  this.neighbours = Array();
  this.colour = getColourToUse();
  this.rotate = 0;
  this.ctx = context;
  this.ink = 0;
  this.grid = grid;
  this.xPixels = x * grid.totalBlockWidth;
  this.yPixels = y * grid.totalBlockWidth;
}

Block.prototype.setNeighbours = function(neighbours) {
  this.neighbours = neighbours;
}

Block.prototype.hit = function() {
  this.colour.copy(getColourToUse());
  this.ink = 200;
  this.rotate = 1;
}

Block.prototype.doThings = function() {
  // Work out which neighbour has the most ink
  var bestNeighbour = this.neighbours[0];
  for (index = 1; index < this.neighbours.length; index ++) {
    if (this.neighbours[index].ink > bestNeighbour.ink) {
      bestNeighbour = this.neighbours[index];
    }
  }

  // Only do something if the best neighbour has more ink than me
  if (bestNeighbour.ink > this.ink && bestNeighbour.ink > 1) {
    this.colour.stepTowardsColour(bestNeighbour.colour);
    this.ink = Math.round(bestNeighbour.ink * 0.7) ;
    bestNeighbour.ink = Math.max(0, (bestNeighbour.ink - Math.round(this.ink / 50)));
  }
  else if (this.ink > 0) {
    this.ink--;
  }

  // If the ink is 0, return to base
  if (this.ink == 0) {
    this.colour.stepTowardsColour(baseColour);
  }
}

Block.prototype.draw = function() {
  var ctx = this.ctx;

  borderColour = new Colour(this.colour.r, this.colour.g, this.colour.b);
  borderColour.add(20);

  ctx.fillStyle = this.colour.toRgba(1);
  ctx.strokeStyle = 'rgba(255,255,255, 0.2)';

  ctx.save();

  ctx.translate((this.xPixels) + this.grid.halfBlockWidth - 248, (this.yPixels) + this.grid.halfBlockWidth - 248);
  if (this.rotate > 0) {
    ctx.rotate((Math.PI / 180) * this.rotate);
  }
  ctx.fillRect (-this.grid.halfBlockWidth, -this.grid.halfBlockWidth, this.grid.blockWidth , this.grid.blockWidth);

  sizeDiff = Math.round((Math.floor(this.grid.blockWidth / 2)) * (this.ink / this.grid.maxInk));

  ctx.lineWidth = sizeDiff;

  if (sizeDiff > 0) {
    ctx.strokeRect(-this.grid.halfBlockWidth + (sizeDiff / 2), -this.grid.halfBlockWidth + (sizeDiff / 2), this.grid.blockWidth - (sizeDiff), this.grid.blockWidth - (sizeDiff));
  }

  if (this.rotate > 0) {
    this.rotate += 10;
  }
  if (this.rotate > 90) {
    this.rotate = 0;
  }
  ctx.restore();
}

/* Grid */
function Grid(r, c) {
  this.rows = r;
  this.cols = c;
  this.blockWidth = 30;
  this.blockSpacing = 1;
  this.maxInk = 200;
  this.blocks = Array();
  this.blocksSequence = Array();
  var canvasContext = document.getElementById('nameCanvas').getContext('2d');
  this.totalBlockWidth = this.blockWidth + this.blockSpacing;
  this.halfBlockWidth = Math.floor(this.totalBlockWidth / 2);

  this.initialise = function() {
    // initialise the blocks
    for (rows = 0; rows < this.rows; rows ++) {
      row = new Array;
      for (cols = 0; cols < this.cols; cols ++) {
        row[cols] = new Block(canvasContext, cols, rows, this);
      }
      this.blocks[rows] = row;
    }

    // Loop through all the blocks and assign neighbours
    for (rows = 0; rows < this.rows; rows ++) {
      for (cols = 0; cols < this.cols; cols ++) {
        neighbours = Array();
        if (cols < (this.cols - 2)) {
          neighbours.push(this.blocks[rows][cols + 1]);
        }
        if (rows < (this.rows - 2)) {
          neighbours.push(this.blocks[rows + 1][cols]);
        }
        if (cols > 0) {
          neighbours.push(this.blocks[rows][cols - 1]);
        }
        if (rows > 0) {
          neighbours.push(this.blocks[rows - 1][cols]);
        }
        this.blocks[rows][cols].setNeighbours(neighbours);
        this.blocksSequence.push(this.blocks[rows][cols]);
      }
    }
  }
}

/* Animations */
function StartMessage(message) {
  this.message = message.toLowerCase();
  this.msgIndex = 0;
  this.timer = null;

  var self = this;
  this.timer = setInterval(function() {self.tick();}, 300);

  this.tick = function() {
    if (this.message[this.msgIndex].match(/[a-z]/i) || this.message[this.msgIndex].match(/[0-9]/i)) {
      renderLetter(this.message[this.msgIndex]);
    }
    this.msgIndex++;

    if (this.msgIndex >= this.message.length) {
      clearInterval(this.timer);
      colourMode = true;
    }
  }

  this.stop = function() {
    clearInterval(this.timer);
    colourMode = true;
  }
}

/* Helper methods */
function tick() {
  canvasContext.clearRect(0, 0, 600, 600);
  canvasContext.save();
  canvasContext.translate(250, 250);

  for (block = 0; block < grid.blocksSequence.length; block ++) {
    grid.blocksSequence[block].doThings();
    grid.blocksSequence[block].draw();
  }
  canvasContext.restore();
}

function rand (n) {
  return (Math.floor (Math.random () * n));
}

function getColourToUse() {
  if (colToUse.equals(targetColour)) {
    if(colourMode) {
      targetColour = new Colour(rand(255), rand(255),rand(255));
    }
    else {
      r = 255 - rand(200);
      targetColour = new Colour(r, r, r);
    }
  }
  colToUse.stepTowardsColour(targetColour);
  colToUse = new Colour(colToUse.r, colToUse.g, colToUse.b);
  return colToUse;
}

function renderLetter(letter) {
  toRender = letters[letter];
  colour = getColourToUse();
    for (rows = 0; rows < 16; rows ++) {
      rowTotal = 0;
      for (cols = 0; cols < 16; cols ++ ) {
         if ((toRender[rows] & Math.pow(2, cols)) > 0) {
           grid.blocks[rows][cols].hit();
         }
      }
    }
}

function autoAdd(num) {
  for (index = 0; index < num; index ++) {
    blockNum = rand(grid.blocksSequence.length);
    grid.blocksSequence[blockNum].hit();
  }
}


letters  = {
'a' : [0,0,0,896,960,1984,1984,1760,3680,4080,4080,8176,6200,14392,14392,0],
'b' : [0,0,0,2032,4080,3120,3120,3888,4080,8176,7216,6192,7216,8176,4080,0],
'c' : [0,0,0,4064,8176,7224,6200,24,24,24,24,6168,7224,8176,4064,0],
'd' : [0,0,0,2040,4088,3608,7192,7192,6168,7192,7192,7192,3608,4088,2040,0],
'e' : [0,0,0,8176,8176,48,48,48,4080,4080,48,48,48,8176,8176,0],
'f' : [0,0,0,4080,4080,48,48,48,2032,2032,48,48,48,48,48,0],
'g' : [0,0,0,4064,8176,14392,14392,24,24,15896,15896,12344,14392,16368,16352,0],
'h' : [0,0,0,6192,6192,6192,6192,6192,8176,8176,6192,6192,6192,6192,6192,0],
'i' : [0,0,0,384,384,384,384,384,384,384,384,384,384,384,384,0],
'j' : [0,0,0,3072,3072,3072,3072,3072,3072,3072,3072,3168,3680,4064,2016,0],
'k' : [0,0,0,3608,1816,920,984,504,248,504,952,1944,1816,3608,7704,0],
'l' : [0,0,0,48,48,48,48,48,48,48,48,48,48,4080,4080,0],
'm' : [0,0,0,14392,14392,15480,15480,15480,16120,14040,14040,14296,14296,13208,13208,0],
'n' : [0,0,0,6256,6256,6384,6384,6640,7088,7088,7984,7728,7728,7216,7216,0],
'o' : [0,0,0,4064,8176,14392,14392,12312,12312,12312,12312,14392,14392,8176,4064,0],
'p' : [0,0,0,4080,8176,7216,6192,7216,7728,4080,1008,48,48,48,48,0],
'q' : [0,0,0,2032,4088,7196,7196,6156,6156,6156,6156,7964,7964,8184,16368,6144],
'r' : [0,0,0,4088,4088,3096,3096,3864,4088,2040,3608,3608,3096,3096,7192,0],
's' : [0,0,0,1008,2040,3608,3608,248,1016,2016,3840,3612,3612,2040,2032,0],
't' : [0,0,0,8184,8184,384,384,384,384,384,384,384,384,384,384,0],
'u' : [0,0,0,6192,6192,6192,6192,6192,6192,6192,6192,6192,7280,8176,4064,0],
'v' : [0,0,0,7180,7196,3100,3608,1592,1840,1904,880,992,992,480,448,0],
'w' : [0,0,0,25027,29127,29671,29670,13158,13166,16254,7804,7740,7740,7740,3096,0],
'x' : [0,0,0,3612,3640,1904,1008,992,448,480,992,1904,1848,3644,7196,0],
'y' : [0,0,0,3598,3612,1852,952,1008,496,224,192,192,192,192,192,0],
'z' : [0,0,0,8160,8160,7168,3584,1792,1920,896,448,224,240,8176,8176,0],
'!' : [0,0,0,384,384,384,384,384,384,384,384,384,0,384,384,0],
'1' : [0,0,0,3072,3840,3968,3456,3072,3072,3072,3072,3072,3072,3072,3072,0],
'2' : [0,0,0,2016,4080,3696,3120,3584,3840,1920,960,480,240,4080,4080,0],
'3' : [0,0,0,992,2032,1584,1552,1920,1984,3968,3584,3120,3632,2032,2016,0],
'4' : [0,0,0,1792,1792,1920,1984,1728,1760,1648,1584,4080,4080,1536,1536,0],
'5' : [0,0,0,2032,2032,48,48,2032,2032,3632,3584,3632,3632,2032,992,0],
'6' : [0,0,0,2016,2032,3696,48,2032,2032,3632,3632,3632,3696,2032,2016,0],
'7' : [0,0,0,4064,4064,3072,3584,1536,1792,1792,768,896,384,384,448,0],
'8' : [0,0,0,2016,2032,1648,1648,2032,992,2032,3696,3632,3632,4080,2016,0],
'9' : [0,0,0,992,2032,3632,3632,3632,4080,4064,4032,3632,1584,2032,992,0],
'0' : [0,0,0,992,2032,3696,3632,3632,3120,3120,3632,3632,3696,2032,992,0]
};
