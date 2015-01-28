$(document).ready(function(){
  'use strict';

var url_textfield = document.getElementById('url');
var connect_button = document.getElementById('connect');
var disconnect_button = document.getElementById('disconnect');
var nickname_inputfield = document.getElementById('nickname');

var chatwindow;
var userlist;
var pendingChallenges = [];

var send;
var websocket;
var currentServerUrl = "";

var openConnection = function() 
{
  console.log('Connecting to: ' + url_textfield.value);
  websocket = new WebSocket(url_textfield.value, 'chat-protocol');
  
  websocket.onopen = function() 
  {
    var str = '{ "action":"connect", "username": "'+nickname_inputfield.value+'"}';
    sendMessage(str);

    console.log('The websocket is now open.');
    
    var str = '{ "action":"requestUserList"}';
    sendMessage(str);
    
    console.log('Retrieving the list of logged in users.');
  }
 
  websocket.onmessage = function(event) 
  {
    receiveMessage(event.data);
  }
 
  websocket.onclose = function() 
  {
    console.log('The websocket is now closed.');
  }

  disableConnectInput();
  openChatWindow();
};


var sendMessage = function(message)
{

  if(!websocket || websocket.readyState === 3) {
    console.log('The websocket is not connected to a server.');
  } else {

    websocket.send(message);      
  }
};

var receiveMessage = function(message)
{
  var json = JSON.parse(message);

  //chat commands
  if(json['type'] == 'servermsg')
  {
    $(chatwindow).append('<div class="row red">' + json['date'] + " " + json['message'] + '</div>');
  }
  else if(json['type'] == 'clientmsg')
  {
    $(chatwindow).append('<div class="row">' + json['date'] + " &lt;" + json['username']+"&gt;" + " " + json['message'] + '</div>');
  }
  else if(json['type'] == 'servernotice')
  {
    var username = "";
    if(json['username']){username=json['username'];}

    $(chatwindow).append('<div class="row green">' + json['date'] +" " + username + json['message'] + '</div>');
  }
  
  //game commands
  else if(json['type'] == 'challengereceived')
  {
    receiveChallenge(json['username']);
  }

  else if(json['type'] == 'challengesent')
  {
   
  }

  else if(json['type'] == 'selfchallenge')
  {
    console.log("selfchallenge");
    alert("du kan inte utmana dig själv.");
  }

  else if(json['type'] == 'startGame')
  {
    var locs1 = new Vector(json['playerx'], json['playery']);
    var locs2 = new Vector(json['opponentx'], json['opponenty']);
    Game.init(locs1, locs2);
    startGame();
  }

  else if(json['type'] == 'inputaction')
  {
    //var locs1 = new Vector(json['locsx'], json['locsy']);
    var tank = Game.getEnemy();
    //tank.setPosition(locs1);

        if (json['move'] == "moveforward"){tank.moveForward(); tank.isThrottling = true;}
        if (json['move'] == "rotateleft") {tank.rotateLeft(); }
        if (json['move'] == "moveBackward"){tank.moveBackward(); tank.isReverse = true; }
        if (json['move'] == "rotateRight") {tank.rotateRight(); }
        if (json['move'] == "keyup"){tank.isThrottling = false;}
        if (json['move'] == "keydown"){tank.isReverse = false; }

        if (json['move'] == "turretleft") {tank.rotateTurretLeft(); }
        if (json['move'] == "turretright") {tank.rotateTurretRight(); }
        if (json['move'] == "firecannon") {tank.fireCannon();}
        if (json['move'] == "playerdeath") {tank.applyCollision(); Game.pauseGame(); Game.gameOver("Du förlorade"); gameOverMsg("Du förlorade");}
  }

  

  else if(json['type'] == 'userlist')
  {
    userlist.innerHTML = "";
    for(var i = 0; i<json['userlist'].length;i++)
    {
      var userid = json['userlist'][i]['id'];
      var username = json['userlist'][i]['username'];
      var clickbutton = $("<button class='userlink' value="+username+">"+username+"</button>");
      var row = $('<div class="row"></div>');
      $(row).appendTo(userlist);
      $(clickbutton).appendTo(row);
      
      $(clickbutton).click(function(){ 
           $("#userlist .row .challengebox").remove();
           var challengeWrapper = $('<div class="challengebox"></div>');
           var challengeButton = $('<button class="challengebutton" value='+$(this).attr("value")+'>Utmana</button>');
          $(challengeWrapper).appendTo($(this).parent());
          $(challengeButton).appendTo(challengeWrapper);

            challengeButton.click(function(){
            var value = $(this).attr("value");
            challengePlayer(value); 
            $(this).remove();
          });

      });


    }
    
  }
};

var closeConnection = function() 
{
  if(websocket == null) //OPEN
  {
    console.log('No active connection to disconnect from. Ignoring');
  }
  else if(websocket.readyState == 1)
  {
    console.log('disconnecting from: ' + url_textfield.value);
    websocket.close();
    enableConnectInput();
  }
  else
  {
    console.log('The connection is not in a state that allows disconnect. Ignoring');
    enableConnectInput();
  }
}

var initializeBindings = function()
{
  // Event handler to create the websocket connection when someone clicks the button #connect
  connect_button.addEventListener('click', function(event) {
    if(nickname_inputfield.value)
    { 
      openConnection();
    }
    else
    {
      alert("You have to choose a username");
    }

  } , false);

  disconnect_button.addEventListener('click', function(event) {
    closeConnection();
  }, false);
}

var disableConnectInput = function()
{
  disableButton(url_textfield);
  disableButton(nickname_inputfield);
  disableButton(connect_button);
  enableButton(disconnect_button);
}

var enableConnectInput = function()
{
  enableButton(nickname_inputfield);
  enableButton(url_textfield);
  enableButton(connect_button);
  disableButton(disconnect_button);
}


var disableButton = function(button)
{
  $(button).attr('disabled', 'disabled');
}

var isConnected = function()
{
  return websocket != null && websocket.readyState==1;
}

var enableButton = function(button)
{
  $(button).removeAttr('disabled');
}

$(url_textfield).change(function() {
    closeConnection();
    disableButton(disconnect_button);
    enableButton(connect_button);
});

var openChatWindow = function()
{
  $("#chatwindowWrapper").remove();
  $('#flash').append('<div id="chatwindowWrapper"><div id="chatwindow"></div><div id="userlist"></div><div id="buttonswrapper"><input id="chatinput" value=""/><button id="send">Send</button></div></div>');

  $('#send').click(function() {
  
    var message = $('#chatinput').val();
    
    if(message!='' && message.substring(0,1)=='/')
    {
      message = '{ "action":"command", "message": "'+message+'"}';
      sendMessage(message);
      $('#chatinput').val("");
    }
    else if(message!='')
    {
      message = '{ "action":"message", "message": "'+message+'"}';
      sendMessage(message);
      $('#chatinput').val("");
    }
   });
  chatwindow = document.getElementById('chatwindow');
  userlist = document.getElementById('userlist');
}

var gameOverMsg = function()
{
   $("<div class='acceptbox'>Grattis du vann <br /><button class='avsluta' value='deny'>Avsluta</button></div>").appendTo('#flash');
    $(".deny").click(function(){
            $('canvas1').remove();     
        });
}

var receiveChallenge = function(username) 
{
  $("<div class='acceptbox'>Utmanad av: "+username+"<br /><button class='acceptbutton' value='accept'>Accept</button><button class='denybutton' value='deny'>Deny</button></div>").appendTo('#flash');
   $(".acceptbutton").click(function(){
              var str = '{ "action":"acceptchallenge", "username":"'+username+'"}';

              $(this).parent().remove();
              sendMessage(str);
              
          });

    $(".denybutton").click(function(){
            var str = '{ "action":"denychallenge", "username":"'+username+'"}';

            $(this).parent().remove();
            sendMessage(str);
              
        });

}
var challengePlayer = function(username) 
{
  if(pendingChallenges.indexOf(username)==-1)
  {
  var str = '{ "action":"challenge", "username": "'+username+'"}';
  sendMessage(str);
  pendingChallenges.push(username);
  }
  else
  {
    alert("Du har redan utmana den här spelaren");
  }
}

var loadGame = function() 
{
  
}

 enableConnectInput();
 initializeBindings();

window.requestAnimFrame = (function(){

  return  window.requestAnimationFrame       || 
          window.webkitRequestAnimationFrame || 
          window.mozRequestAnimationFrame    || 
          window.oRequestAnimationFrame      || 
          window.msRequestAnimationFrame     || 
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
})();
 
 
/**
 * Shim layer, polyfill, for cancelAnimationFrame with setTimeout fallback.
 */
window.cancelRequestAnimFrame = (function(){
  return  window.cancelRequestAnimationFrame || 
          window.webkitCancelRequestAnimationFrame || 
          window.mozCancelRequestAnimationFrame    || 
          window.oCancelRequestAnimationFrame      || 
          window.msCancelRequestAnimationFrame     || 
          window.clearTimeout;
})();

var startGame = function(){
    Game.gameLoop();
    console.log('Ready to play.');  
};
window.onkeydown = function(e) { 
  if (e.keyCode == 32 && e.target == document.body)
    return false;
  else if (e.keyCode == 40 && e.target == document.body)
    return false;
  else if (e.keyCode == 38 && e.target == document.body)
    return false;
}; 
var Key = {
  _pressed: {},

  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  A: 65,
  D: 68,
  G: 71,
  BLANKSPACE: 32,
  
  isDown: function(keyCode) {
    return this._pressed[keyCode];
  },
  
  onKeydown: function(event) {
    this._pressed[event.keyCode] = true;
  },
  
  onKeyup: function(event) {
    delete this._pressed[event.keyCode];
  }
};

window.addEventListener('keyup', function(event) { Key.onKeyup(event); return false;}, false);
window.addEventListener('keydown', function(event) { Key.onKeydown(event); return false;}, false);

/**
 * All positions and forces 
 */
function Vector(x, y) {
  this.x = x || 0;
  this.y = y || 0;
};


window.Game = (function(){
  var canvas, ct, gameobjects, lastGameTick, enemy, loopy;
  var playerlist = [];
  var loop = 0;
  var lastKnownLoc;

  var init = function(locs1, locs2) {
    canvas = document.getElementById("canvas1");
    ct = canvas.getContext('2d');
    ct.canvas.width = 800;
    ct.canvas.height = 400;

    ct.lineWidth = 1;
    ct.strokeStyle = 'hsla(0,0%,100%,1)',
    ct.fillStyle = 'hsla(0,0%,100%,1)',
    
    gameobjects = new GameObjects();

    var player1 = new Player("Magnus");
    enemy = new Enemy("General Patton");

    var tank = new Tank(32, 64, new Vector(locs1.x, locs1.y), new Vector(6, 4), player1);
    var tank2 = new Tank(32, 64, new Vector(locs2.x, locs2.y), new Vector(6, 4), enemy);

    player1.setVehicle(tank);
    enemy.setVehicle(tank2);
    playerlist.push(player1);

    gameobjects.add(tank);
    gameobjects.add(tank2);

    var obstacle1 = new Obstacle(new Vector(100, 100), 200, 25, 0);
    var obstacle2 = new Obstacle(new Vector(600, 100), 200, 25, 0);
    var obstacle3 = new Obstacle(new Vector(300, 200), 200, 25, 0);//Math.PI/4);
    gameobjects.add(obstacle1);
    gameobjects.add(obstacle2);
    gameobjects.add(obstacle3);

    console.log('Init the game');
  }

  var gameOver = function(msg)
  {
    ct.beginPath(); 
    ct.clearRect ( 0 , 0 , ct.width, ct.height );
    ct.fillStyle = "black";
    ct.fillRect( 0 , 0 , ct.width, ct.height );
    ct.fillStyle = "yellow";
    ct.font = "bold 40px Arial";
    ct.fillText(msg, 200, 300);
    ct.closePath();
  } 

  var gameLoop = function() {
      
      var now = Date.now();
      var td = (now - (lastGameTick || now)) / 1000; // Timediff since last frame / gametick
     lastGameTick = now;
    loopy = requestAnimFrame(gameLoop);
      ct.clearRect(0,0,ct.canvas.width, ct.canvas.height);
    
        gameobjects.collisionCheck();
    checkForPlayerInput();
    gameobjects.update(td);

    gameobjects.draw(ct);

  };

    var pauseGame = function() {
      cancelRequestAnimFrame(loopy);

    }

    var unpauseGame = function() {
      requestAnimFrame(loopy);
    }

  var checkForPlayerInput = function()
  {
    for(var i = 0; i<playerlist.length; i++)
    {
      var tank = playerlist[i].getVehicle();
      
      if(playerlist[i] instanceof Player)
      {
        if (Key.isDown(Key.UP)){tank.moveForward(); tank.isThrottling = true; sendMessage('{ "action":"inputaction", "move": "moveforward"}');}
        if (Key.isDown(Key.LEFT)) {tank.rotateLeft(); sendMessage('{ "action":"inputaction", "move": "rotateleft"}');}
        if (Key.isDown(Key.DOWN)){tank.moveBackward(); tank.isReverse = true;  sendMessage('{ "action":"inputaction", "move": "moveBackward"}');}
        if (Key.isDown(Key.RIGHT)) {tank.rotateRight();  sendMessage('{ "action":"inputaction", "move": "rotateRight"}');}
        if (!Key.isDown(Key.UP)){tank.isThrottling = false;  sendMessage('{ "action":"inputaction", "move": "keyup"}');}
        if (!Key.isDown(Key.DOWN)){tank.isReverse = false;  sendMessage('{ "action":"inputaction", "move": "keydown"}');}

        if (Key.isDown(Key.A)) {tank.rotateTurretLeft();  sendMessage('{ "action":"inputaction", "move": "turretleft"}');}
        if (Key.isDown(Key.D)) {tank.rotateTurretRight(); sendMessage('{ "action":"inputaction", "move": "turretright"}');}
        if (Key.isDown(Key.BLANKSPACE)) {tank.fireCannon(); sendMessage('{ "action":"inputaction", "move": "firecannon"}');}
      }
      
    } 
  }

  var getEnemy = function()
  {
    return enemy.getVehicle();
  }

  var getSize = function()
  {
    return new Vector(ct.canvas.width, ct.canvas.height);
  }

  var getGameMap = function()
  {
    return ct;
  }

  var getGameObjects = function()
  {
    return gameobjects;
  }
 
 var getCanvas = function()
  {
    return ct;
  }

  return {
    'getEnemy': getEnemy,
    'init': init,
    'pauseGame': pauseGame,
    'gameLoop': gameLoop,
    'getSize': getSize,
    'getGameMap': getGameMap,
    'getGameObjects': getGameObjects,
    'getCanvas': getCanvas,
    'gameOver': gameOver,
  }
})();
 

function Player(nickname) {
this.username = nickname;
this.health = 10;
this.kills = 0;
this.vehicle;
}
Player.prototype.getVehicle = function()
{
  return this.vehicle;
}

Player.prototype.setVehicle = function(vehicle)
{
  this.vehicle = vehicle;
}

Player.prototype.update = function()
{

}

Player.prototype.getHealth = function()
{
  return this.health;
}

Player.prototype.setHealth = function(health)
{
  this.health = health;
}
Player.prototype.getUsername = function()
{
  return this.username;
}

function Enemy(nickname) {
this.username = nickname;
this.health = 10;
this.kills = 0;
this.vehicle;
}
Enemy.prototype.getVehicle = function()
{
  return this.vehicle;
}

Enemy.prototype.setVehicle = function(vehicle)
{
  this.vehicle = vehicle;
}

Enemy.prototype.getHealth = function()
{
  return this.health;
}

Enemy.prototype.setHealth = function(health)
{
  this.health = health;
}
Enemy.prototype.getUsername = function()
{
  return this.username;
}

/**
 * A Tank as an object.
 */
function Tank(width, height, position, velocity, owner) {
  //stridsvagnens ägare
  this.owner = owner;

  //Stridsvagnens hastighet.
  this.speed    = 0;
  this.max_speed = 4;
  this.reverse_speed = 0;
  this.reverse_maxspeed = 1;

  //Stridsvagnens attackhastighet
  this.reloadTime = 1;
  this.lastAttack = 0;
  this.velocity = velocity  || new Vector(1,1); 

  //Stridsvagnens acceleration och riktning
  this.direction = 0;
  this.acceleration = 0.05;
  this.deacceleration = 0.05;

  //Stridsvagnens storlek
  this.height   = height    || 32;
  this.width    = width     || 32;

  //Stridsvagnens position.
  this.position_body = position  || new Vector(10,10);
  this.position_turret = getCenterOfRect(this.position_body,this.width,this.height);
  
  //Stridsvagnstornets position, storlek, riktning.
  this.cannonLocation = new Vector(0,0);
  this.turret_size = 12;
  this.turret_cannon_size = new Vector(6,18);
  this.turret_direction = 0;

  //Anger om stridsvagnen gasar framåt eller backar.
  this.isThrottling = false;
  this.isReverse = false;

  this.hasCollided = false;
}

Tank.prototype.setPosition = function(locs)
{
  this.position_body = locs;
}

  //Anropas 1 gång per frame.
Tank.prototype.update = function(td)
{
  //Kontrollerar när senaste attacken skedde.
  this.lastAttack += td;
  //Lägger in lite verklighetstrogen friktion.
  this.applyGravity();
  //uppdaterar kanontornets position i förhållande till stridsvagnskroppen.
  this.position_turret = getCenterOfRect(this.position_body,this.height,this.width);
  this.cannonLocation.x = this.position_turret.x-this.turret_cannon_size.x/2;
  this.cannonLocation.y = this.position_turret.y-this.turret_size-this.turret_cannon_size.y;
}

Tank.prototype.draw = function(ct) {
  this.drawBody(ct);
  this.drawTurretBase(ct);
  this.drawTurretCannon(ct);
};

Tank.prototype.drawBody = function(ct)
{
        ct.save();
        var pos = getCenterOfRect(this.position_body, this.height, this.width);
        ct.translate(pos.x, pos.y);
        ct.rotate(this.direction);
        ct.translate(-pos.x, -pos.y);

        var image = new Image();
        image.src="img/Tanken.png";

       //  ct.fillStyle="#FF0000";
        ct.drawImage(image, this.position_body.x, this.position_body.y, this.width, this.height);
        //ct.fillRect(this.position_body.x, this.position_body.y, this.width, this.height);
        ct.restore();
}

Tank.prototype.drawTurretBase = function(ct)
{
  ct.beginPath();
  ct.fillStyle="#303030";
  ct.arc(this.position_turret.x, this.position_turret.y, this.turret_size, 0, Math.PI*2, true); 
  ct.fill();
  ct.closePath();
}

Tank.prototype.drawTurretCannon = function(ct)
{
  ct.beginPath();
  ct.fillStyle="#707070";

  var pos2 = getCenterOfRect(this.position_body, this.height, this.width);
  ct.save();
  ct.translate(pos2.x, pos2.y);
  ct.rotate(this.turret_direction);
  ct.translate(-pos2.x, -pos2.y);
  ct.fillStyle="#707070";
  ct.fillRect(this.cannonLocation.x, this.cannonLocation.y, this.turret_cannon_size.x, this.turret_cannon_size.y);
  ct.restore();
  ct.closePath();
}

Tank.prototype.getLocation = function()
{
   return this.position_body;
}

Tank.prototype.applyGravity = function()
{

  //Man gasar inte men rullar fortarande framåt.
  if(!this.isThrottling && this.speed > 0)
  {
    //Man trycker ner backen trots att man rullar framåt. Dubbel effekt
    if(this.isReverse){
    this.deaccelerate(this.deacceleration*2, true);}
    
    //alla knappar uppsläppta. Normal effekt.
    else
    {
      this.deaccelerate(this.deacceleration, true);
    }
    this.moveForward();
  }
  //Backar inte men rullar fortfarande bakåt
  else if(!this.isReverse && this.reverse_speed > 0)
  {
      //gasar trots att man rullar bakåt. Dubbel effekt
      if(this.isThrottling){
      this.deaccelerate(this.deacceleration*2, false);
      }
      //normal effekt
      else
      {
        this.deaccelerate(this.deacceleration, false);
      }
      this.moveBackward();
  }
}

Tank.prototype.fireCannon = function()
{ 
  if(this.lastAttack>=this.reloadTime)
  {
    //location, width, direction, velocity, damage, owner
      
    var posholder = getRotatedRectCorners(new Vector(this.cannonLocation.x, this.cannonLocation.y+this.turret_cannon_size.y), this.turret_cannon_size.y+this.turret_size/2, this.turret_cannon_size.x, this.turret_direction); 

    //de två sista positionerna i arrayen är alltid de längst från origin....
    var max1 = posholder[3];
    var max2 = posholder[2];
    var diffx = max1.x - max2.x;
    var diffy = max1.y - max2.y;
    var spawnLocation = new Vector(max1.x-diffx/2,max1.y-diffy/2);

    //posholder = sortCoordinatesByOriginDistance(origin, posholder);
    var bullet = new Bullet( new Vector( spawnLocation.x,  spawnLocation.y),2, this.turret_direction, 14, 10, this);
    var gameobjects = Game.getGameObjects();
    gameobjects.add(bullet);

    this.lastAttack = 0;

    var snd = new Audio("shoot.wav"); // buffers automatically when created
    snd.play();
  }
}

Tank.prototype.moveTank = function(x, y)
{   
    //ingen krock har skett. Full fart framåt.
    if(this.checkForWallCollision(x, y, this.direction) == false && this.checkForObstacleCollision(x, y, this.direction) == false)
    {
        this.position_body.x += x;
        this.position_body.y += y;
    }

    //krock har skett.
   else if(this.checkForWallCollision(x, y, this.direction) == true)
    {
      //krock i y led. Kollar om det går att flytta i x-led.
      if(this.checkForWallCollision(x, 0, this.direction) == false)
      {
        if(this.isThrottling)
        {
          this.speed = 0.5;
        }
        this.position_body.x += x;
        this.position_body.y -= 0;
      }

      //krock i x led. Kollar om det går att flytta i y-led.
      else if(this.checkForWallCollision(0, y, this.direction) == false)
      {
        if(this.isThrottling)
        {
          this.speed = 0.5;
        }
        this.position_body.x -= 0;
        this.position_body.y += y;
      }

      //Stridsvagnen sitter fast...
      else{
        this.speed = 0;
      }

    }

    else if(this.checkForObstacleCollision(x, y, this.direction))
    {
       if(this.checkForObstacleCollision(x, 0, this.direction) == false)
       {
        if(this.isThrottling)
        {
          this.speed = 0.5;
        }
        this.position_body.x += x;
        this.position_body.y -= 0;
       }
       else if(this.checkForObstacleCollision(0, y, this.direction) == false)
       {
          if(this.isThrottling)
          {
            this.speed = 0.5;
          }
        this.position_body.x -= 0;
        this.position_body.y += y;
       }

    }

}

Tank.prototype.rotateLeft = function() {
      if(this.checkForWallCollision(0, 0, this.direction-Math.PI/90) == false  && this.checkForObstacleCollision(0, 0, this.direction-Math.PI/90) == false)
      {
        this.direction -= Math.PI/90;
      }
};

Tank.prototype.rotateRight = function() {
  if(this.checkForWallCollision(0, 0, this.direction+Math.PI/90) == false  && this.checkForObstacleCollision(0, 0, this.direction+Math.PI/90) == false)
  {
    this.direction += Math.PI/90; 
  }
};

Tank.prototype.rotateTurretLeft = function() {
  this.turret_direction -= Math.PI/90;
};

Tank.prototype.rotateTurretRight = function() {
   this.turret_direction += Math.PI/90;
};

Tank.prototype.moveLeft = function() {
  this.moveTank(-this.speed,0);
};

Tank.prototype.moveRight = function() {
  this.moveTank(+this.speed,0);
};

Tank.prototype.moveUp = function() {
  this.moveTank(0,-this.speed);
};

Tank.prototype.accelerate = function(forward)
{
  if(forward)
  {
    if(this.reverse_speed<=0){
    if(this.speed < this.max_speed)
    {
      this.speed += this.acceleration;
    }}
  }
  else
  {
    if(this.speed<=0){
      if(this.reverse_speed < this.reverse_maxspeed)
      {
        this.reverse_speed += this.acceleration;
      }}
  }
}

Tank.prototype.deaccelerate = function(force, forward)
{
  if(forward)
  {
    if(this.speed > 0)
    {
      this.speed -= force;
    }
  }
  else{
     if(this.reverse_speed > 0)
      {
        this.reverse_speed -= force;
  }}
  
}

Tank.prototype.moveForward = function() {
    if(this.isThrottling)
     { this.accelerate(true);}
    
    if(this.reverse_speed<=0){
    var x = this.speed * Math.sin(this.direction);
    var y = this.speed * -Math.cos(this.direction);
    this.moveTank(x, y);
  }
  };

Tank.prototype.moveBackward = function() {
      if(this.isReverse)
     { this.accelerate(false);}

   if(this.speed<=0){
    var x = this.reverse_speed * -Math.sin(this.direction);
    var y = this.reverse_speed * Math.cos(this.direction);
    this.moveTank(x, y);
    }
  };

Tank.prototype.moveDown = function() {
  this.moveTank(0,+this.speed);
};

Tank.prototype.applyCollision = function()
{
  Game.getGameObjects().remove(this);
}

Tank.prototype.checkForCollision = function(obj)
{
  if(obj instanceof Bullet)
  {

    if(obj.getOwner() == this)
    {
      return;
    }

    //hitbox circle på tanken...fulhack
    var collision = checkCircleCollision(obj.getLocation(), obj.getWidth(), this.position_turret, this.width);

    if(collision)
    {
      console.log("Tank hit");
      this.owner.setHealth(this.owner.getHealth()-obj.getDamage());
      console.log(this.owner.getUsername() + " Tank hit. Health: " + this.owner.getHealth());
      obj.applyCollision;

      if(this.owner.getHealth()<=0)
      {
         Game.getGameObjects().remove(this);
         var str = '{ "action":"inputaction", "move": "playerdeath"}';
         sendMessage(str);

        Game.pauseGame();
        Game.gameOver("Grattis, du vann!");
        gameOverMsg("Du vann!");
      }
    }
  }
}

Tank.prototype.checkForObstacleCollision = function(move_x, move_y, rotation)
{
      var gamisar =  Game.getGameObjects().getObstacles();
      var futurePos = new Vector(this.position_body.x+move_x, this.position_body.y+move_y);
      var posholder = getRotatedRectCorners(futurePos, this.height, this.width, rotation);
      var array1 = [{x:posholder[0].x, y:posholder[0].y},{x:posholder[1].x, y:posholder[1].y},{x:posholder[2].x, y:posholder[2].y},{x:posholder[3].x, y:posholder[3].y}];

      for(var i = 0; i<gamisar.length; i++)
      {
          if(gamisar[i] instanceof Obstacle)
          {

             var loc = gamisar[i].getLocation();
              var width = gamisar[i].getWidth();
              var height = gamisar[i].getHeight();

              var rectB = {
              left:   loc.x,
              top:    loc.y,
              right:  loc.x+width,
              bottom: loc.y+height
              };


              var array2 = [{x:rectB.left, y:rectB.top},{x:rectB.right, y:rectB.top},{x:rectB.left, y:rectB.bottom},{x:rectB.right, y:rectB.bottom}];
              
              if(doPolygonsIntersect(array1, array2))
              {
                return true;
              }
           
          }
    
      }
      return false;
}

Tank.prototype.checkForWallCollision = function(move_x, move_y, direction)
{
  var max = Game.getSize();
  var game_max_X = max.x;
  var game_max_Y = max.y;

  var posholder = getRotatedRectCorners(this.position_body, this.height, this.width, direction);
  var xArray = posholder.map(function(obj) { return obj.x; });
  var yArray = posholder.map(function(obj) { return obj.y; });
  var min_X = getLowestCoordinate(xArray);
  var max_X = getHighestCoordinate(xArray);
  var min_Y = getLowestCoordinate(yArray);
  var max_Y = getHighestCoordinate(yArray);

  var future_maxX = max_X+move_x;
  var future_minX = min_X+move_x;
  var future_maxY = max_Y+move_y;
  var future_minY = min_Y+move_y;

  var collisionX = (future_maxX>=game_max_X || future_minX<1);
  var collisionY = (future_maxY>=game_max_Y || future_minY<1);

  if(collisionX || collisionY)
  {
    return true;
  }

  return false;
};

function GameObjects()
{
    this.gameObjects = [];
}

GameObjects.prototype.add = function(obj)
{
  this.gameObjects.push(obj);
}

GameObjects.prototype.remove = function(obj)
{
  var index = this.gameObjects.indexOf(obj);
  this.gameObjects.splice(index, 1);
}

GameObjects.prototype.update = function(td)
{
  for (var i = 0; i < this.gameObjects.length; ++i) {
     this.gameObjects[i].update(td);
  }
}

GameObjects.prototype.getObstacles = function()
{

  return this.gameObjects;
}

GameObjects.prototype.draw = function(ct)
{
    for (var i = 0; i < this.gameObjects.length; ++i) {
     this.gameObjects[i].draw(ct);
  }
}

GameObjects.prototype.collisionCheck = function()
{

 for (var i = 0; i < this.gameObjects.length; ++i) 
    {
      var obj = this.gameObjects[i];
      for (var a = 0; a < this.gameObjects.length; ++a)
      {
        var nextObj = this.gameObjects[a];
        obj.checkForCollision(nextObj);

      }
    }
}

function Obstacle(location, height, width, rotation)
{
    this.location = location;
    this.height = height;
    this.width = width;
    this.rotation = rotation;
}

Obstacle.prototype.update = function(td)
{

}

Obstacle.prototype.draw = function(ct)
{
    var posholder = getRotatedRectCorners(this.location, this.height, this.width, 0);

    ct.save();
    var pos = getCenterOfRect(this.location, this.height, this.width);
    ct.translate(pos.x, pos.y);
    ct.rotate(this.rotation);
    ct.translate(-pos.x, -pos.y);
    ct.fillStyle="#303030";
    ct.fillRect(this.location.x, this.location.y, this.width, this.height);
    ct.restore();
    ct.fillStyle="#FF0000";
    ct.fillRect(posholder[0].x, posholder[0].y, 2, 2);
    ct.fillRect(posholder[1].x, posholder[1].y, 2, 2);
    ct.fillRect(posholder[2].x, posholder[2].y, 2, 2);
    ct.fillRect(posholder[3].x, posholder[3].y, 2, 2);
}

Obstacle.prototype.checkForCollision = function()
{

}
Obstacle.prototype.getLocation = function()
{
  return this.location;
}
Obstacle.prototype.getWidth = function()
{
  return this.width;
}
Obstacle.prototype.getHeight = function()
{
  return this.height;
}

function Bullet(location, width, direction, velocity, damage, owner) {
this.spawnLocation = location;
this.bulletWidth = width;
this.bulletDirection = direction;
this.bullet_velocity = velocity;
this.bullet_damage = damage;
this.bullet_owner = owner;
this.bullet_max_lifetime = 3;
this.bullet_lifetime = 0;
}


Bullet.prototype.move = function()
{   
  this.spawnLocation.x +=  this.bullet_velocity * Math.sin(this.bulletDirection);;
  this.spawnLocation.y += this.bullet_velocity * -Math.cos(this.bulletDirection);
}

Bullet.prototype.draw = function()
{
    var ctx = Game.getGameMap();
    ctx.fillStyle="#1E1E1E";
    ctx.arc(this.spawnLocation.x, this.spawnLocation.y, this.bulletWidth, 0, Math.PI*2, true); 
    ctx.fill();
    ctx.closePath();
}

Bullet.prototype.update = function(td)
{
  this.despawnCheck(td);
  this.move();
  this.checkForCollision();
}

Bullet.prototype.getLocation = function()
{
  return this.spawnLocation;
}

Bullet.prototype.getOwner = function()
{
  return this.bullet_owner;
}

Bullet.prototype.getWidth = function()
{
  return this.bulletWidth;
}

Bullet.prototype.getDamage = function()
{
  return this.bullet_damage;
}

Bullet.prototype.checkForCollision = function(obj)
{
  
  if(obj instanceof Obstacle)
  {
        var circle = {
        x:   this.spawnLocation.x,
        y:   this.spawnLocation.y,
        r:  this.bulletWidth/2
        };

        var rect = {
        x: obj.getLocation().x,
        y: obj.getLocation().y,
        w: obj.getWidth(),
        h: obj.getHeight()
        };

        if(checkRectCircleCollision(circle, rect))
        {
          this.applyCollision();

        }
  }
  
}

Bullet.prototype.applyCollision = function()
{
  Game.getGameObjects().remove(this);
}

Bullet.prototype.despawnCheck = function(td)
{
    this.bullet_lifetime+=td;
    if(this.bullet_lifetime>=this.bullet_max_lifetime)
    {
      Game.getGameObjects().remove(this);
    }
}

window.getCenterOfRect  = (function(location, height, width)
{
  return new Vector(location.x+(width/2),location.y+(height/2));
});


window.getRotatedRectCorners  = (function(location, height, width, rotation)
{
  var pos = getCenterOfRect(location, height, width);

  //avstånd från origin till x.
   var distX = width/2;
  //avstånd från origin till y
  var distY = height/2;

  //finns fyra scenarion. (x,y) (-y,x) (-x,-y) (y,-x).. 
  var newx=(distX)*Math.cos(rotation)-(distY)*Math.sin(rotation)+pos.x;
  var newy=(distX)*Math.sin(rotation)+(distY)*Math.cos(rotation)+pos.y;

  var newx2=(-distX)*Math.cos(rotation)-(distY)*Math.sin(rotation)+pos.x;
  var newy2=(-distX)*Math.sin(rotation)+(distY)*Math.cos(rotation)+pos.y;

  var newx3=(distX)*Math.cos(rotation)-(-distY)*Math.sin(rotation)+pos.x;
  var newy3=(distX)*Math.sin(rotation)+(-distY)*Math.cos(rotation)+pos.y;

  var newx4=(-distX)*Math.cos(rotation)-(-distY)*Math.sin(rotation)+pos.x;
  var newy4=(-distX)*Math.sin(rotation)+(-distY)*Math.cos(rotation)+pos.y;

  var pos1 = new Vector(newx, newy);
  var pos2 = new Vector(newx2, newy2);
  var pos3 = new Vector(newx3, newy3);
  var pos4 = new Vector(newx4, newy4);

  var posholder = [pos1, pos2, pos3, pos4];

  return posholder;
});

window.getLowestCoordinate = (function(obj)
{
  var min = Math.min.apply(null, obj);
  return min;
});

window.getHighestCoordinate = (function(obj)
{
  var max = Math.max.apply(null, obj);
  return max;
});

window.checkCircleCollision = (function(circle1_loc, circle1_width, circle2_loc, circle2_width)
{
  var radius1 = circle1_width/2;
  var radius2 = circle2_width/2;
  var distance = getCoordinateDistance(circle1_loc, circle2_loc);

  if(distance<radius2+radius1)
  {
    return true;
  }
  return false;
});

window.checkRectRectCollision = (function(r1, r2)
{
    var aLeftOfB = r1.right < r2.left;
    var aRightOfB = r1.left > r2.right;
    var aAboveB = r1.top > r2.bottom;
    var aBelowB = r1.bottom < r2.top;

    return !( aLeftOfB || aRightOfB || aAboveB || aBelowB );

});

/**
 * Helper function to determine whether there is an intersection between the two polygons described
 * by the lists of vertices. Uses the Separating Axis Theorem
 *
 * @param a an array of connected points [{x:, y:}, {x:, y:},...] that form a closed polygon
 * @param b an array of connected points [{x:, y:}, {x:, y:},...] that form a closed polygon
 * @return true if there is any intersection between the 2 polygons, false otherwise
 */
function doPolygonsIntersect (a, b) {
    var polygons = [a, b];
    var minA, maxA, projected, i, i1, j, minB, maxB;

    for (i = 0; i < polygons.length; i++) {

        // for each polygon, look at each edge of the polygon, and determine if it separates
        // the two shapes
        var polygon = polygons[i];
        for (i1 = 0; i1 < polygon.length; i1++) {

            // grab 2 vertices to create an edge
            var i2 = (i1 + 1) % polygon.length;
            var p1 = polygon[i1];
            var p2 = polygon[i2];

            // find the line perpendicular to this edge
            var normal = { x: p2.y - p1.y, y: p1.x - p2.x };

            minA = maxA = undefined;
            // for each vertex in the first shape, project it onto the line perpendicular to the edge
            // and keep track of the min and max of these values
            for (j = 0; j < a.length; j++) {
                projected = normal.x * a[j].x + normal.y * a[j].y;
                if (typeof(minA)  == "undefined" || projected < minA) {
                    minA = projected;
                }
                if (typeof(maxA) == "undefined" || projected > maxA) {
                    maxA = projected;
                }
            }

            // for each vertex in the second shape, project it onto the line perpendicular to the edge
            // and keep track of the min and max of these values
            minB = maxB = undefined;
            for (j = 0; j < b.length; j++) {
                projected = normal.x * b[j].x + normal.y * b[j].y;
                if (typeof(minB) == "undefined" || projected < minB) {
                    minB = projected;
                }
                if (typeof(maxB) == "undefined" || projected > maxB) {
                    maxB = projected;
                }
            }

            // if there is no overlap between the projects, the edge we are looking at separates the two
            // polygons, and we know there is no overlap
            if (maxA < minB || maxB < minA) {
                return false;
            }
        }
    }
    return true;
};


window.checkRectCircleCollision = (function(circle, rect)
{
    var distX = Math.abs(circle.x - rect.x-rect.w/2);
    var distY = Math.abs(circle.y - rect.y-rect.h/2);

    if (distX > (rect.w/2 + circle.r)) { return false; }
    if (distY > (rect.h/2 + circle.r)) { return false; }

    if (distX <= (rect.w/2)) { return true; } 
    if (distY <= (rect.h/2)) { return true; }

    var dx=distX-rect.w/2;
    var dy=distY-rect.h/2;
    return (dx*dx+dy*dy<=(circle.r*circle.r));
});

window.getCoordinateDistance = (function(v1, v2)
{
  var diffX = v1.x-v2.x;
  var diffY = v1.y-v2.y;
  var distance = Math.sqrt(Math.pow(diffX,2)+Math.pow(diffY,2));
  return distance;
});

window.countFPS = (function () {
  var lastLoop = (new Date()).getMilliseconds();
  var count = 1;
  var fps = 0;

  return function () {
    var currentLoop = (new Date()).getMilliseconds();
    if (lastLoop > currentLoop) {
      fps = count;
      count = 1;
    } else {
      count += 1;
    }
    lastLoop = currentLoop;
    return fps;
  };
}());

});

