/**
 * Create a stripped websocket-server using the sample code from:
 * https://github.com/Worlize/WebSocket-Node#server-example
 * 
 */
var port = 1337;
var broadcastTo = [];
var chatRoom = new ChatRoom();
var activeGames = [];
// Require the modules we need
var WebSocketServer = require('websocket').server;
var http = require('http');



/**
 * Create a http server with a callback for each request
 *
 */
var httpServer = http.createServer(function(request, response) {
  console.log((new Date()) + ' Received request for ' + request.url);
  response.writeHead(200, {'Content-type': 'text/plain'});
  response.end('Hello world\n');
}).listen(port, function() {
  console.log(currentTime() + ' HTTP server is listening on port ' + port);
});



/**
 * Create an object for the websocket
 * https://github.com/Worlize/WebSocket-Node/wiki/Documentation
 */
wsServer = new WebSocketServer({
  httpServer: httpServer,
  autoAcceptConnections: false
});



/**
 * Always check and explicitly allow the origin
 *
 */
function originIsAllowed(origin) {
  return true;
  if(origin === 'http://dbwebb.se') {
    return true;    
  }
  return false;
}

/**
 * Avoid injections
 *
 */
function htmlEntities(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


/**
 * Accept connection under the broadcast-protocol
 *
 */
function acceptChatConnection(request) {
  var connection = request.accept('chat-protocol', request.origin);

  chatRoom.sendPrivateServerMessage(connection, " connected to the server.");

  connection.on('message', function(message) 
  {
    if(message.type === 'utf8')
    {
      var json = JSON.parse(message.utf8Data);
      if(json['action'] == 'connect')
      {
        chatRoom.addUser(json['username'], json['username'],connection);
        chatRoom.sendPublicServerMessage(connection, " has joined the chat!");
      }
      else if(json['action'] == 'message')
      {
        chatRoom.sendPublicMessage(connection, json['message']);
      }
      else if(json['action'] == 'requestUserList')
      {
        chatRoom.sendUserList();
      }

      else if(json['action'] == 'challenge')
      {
        console.log("skickar challenge till:" + json['username']);
        sendChallenge(connection, json['username']);
      }

      else if(json['action'] == 'acceptchallenge')
      {
        console.log("Utmaning accepterad. Startar game mellan......-.-");
        acceptChallenge(connection, json['username']);
      }

      else if(json['action'] == 'denychallenge')
      {
        console.log("Utmaning ej accepterad.");
      }

      else if(json['action'] == 'inputaction')
      {

        sendLocs(connection, JSON.stringify({type: 'inputaction', move: json['move']}));
      }


      else if(json['action'] == 'command')
      {
        if(json['message'].length>6 && json['message'].substring(0,5)=='/nick')
        {
          var nick = json['message'].substring(6,json['message'].length);
          chatRoom.sendPublicServerMessage(connection, " changed nickname to " + nick);
          var user = chatRoom.getUser(connection.broadcastId);
          user.setId(nick);
          user.setUsername(nick);
          connection.broadcastId=nick;
          chatRoom.sendUserList();

        }
      }
    }
  });
  
  connection.on('close', function(reasonCode, description) {
    chatRoom.sendPublicServerMessage(connection, " has quit the chat!");
    chatRoom.removeUser(connection.broadcastId);
    chatRoom.sendUserList();
  });

  return true;
}

wsServer.on('request', function(request) {
  var status = null;

  if (!originIsAllowed(request.origin)) {
    request.reject();
    console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
    return;
  }

  for (var i=0; i < request.requestedProtocols.length; i++) {

    if(request.requestedProtocols[i] === 'chat-protocol') {
      status = acceptChatConnection(request);
    } 
  };

  // Unsupported protocol.
  if(!status) {
    console.log(request.requestedProtocols);
    console.log('Subprotocol not supported');
    request.reject(404, 'Subprotocol not supported');
  }

});


var sendToAllClients = function(msg)
{
    var clients = 0;

    for(var i=0; i<chatRoom.getUsers().length; i++) {
      if(chatRoom.getUsers()[i]) {
        clients++;
        var chatuser = chatRoom.getUsers()[i];
        chatuser.getConnection().sendUTF(msg);
      }
    }
}

var sendToClientById = function(id, msg)
{
    for(var i=0; i<broadcastTo.length; i++) {
      if(broadcastTo[i] === id) {
        broadcastTo[i].sendUTF(msg);
      }
    }
}

var sendToClient = function(connection, msg)
{
    connection.sendUTF(msg);
}

var currentTime = function()
{
  var date = new Date();
  var hours = date.getHours();
  var minutes = date.getMinutes();

  if(minutes<10)
  {
    minutes = "0"+minutes;
  }

  return hours + ":" +minutes;
}


function ChatRoom() 
{
this.users = [];
this.history = [];
this.maxBuffer = 100;
}
ChatRoom.prototype.addUser = function(username, id, connection)
{
  var user = new ChatUser(username,id, connection);
  connection.broadcastId=id;
  this.users.push(user);
}
ChatRoom.prototype.removeUser = function(id)
{
  for(var i=0; i < this.users.length; i++)
  {
    var user = this.users[i];
    if(user.getId() == id)
    {
      console.log("removing" + user.getUsername() + " id " + user.getId());
      this.users.splice(i,1);
    }
  }
}
ChatRoom.prototype.getUsers = function()
{
  return this.users;
}

ChatRoom.prototype.getUser = function(id)
{
  for(var i=0; i < this.users.length; i++)
  {
    var user = this.users[i];
    if(user.getId() == id)
    {
      return user;
    }
  }
}

ChatRoom.prototype.sendPrivateMessage = function(connection, message)
{
  var user = this.getUser(connection.broadcastId);
  var json = JSON.stringify({type: 'clientmsg', date: currentTime(), username: user.getUsername(), message: message});
  sendToClient(connection, json);
}

ChatRoom.prototype.sendPrivateServerMessage = function(connection, message)
{
  var json = JSON.stringify({type: 'servermsg', date: currentTime(), message: message});
  sendToClient(connection, json);
}

ChatRoom.prototype.sendPublicServerMessage = function(connection, message)
{
  var user = this.getUser(connection.broadcastId);
  var json = JSON.stringify({type: 'servernotice', date: currentTime(), username: user.getUsername(), message: message});
  sendToAllClients(json);
}

ChatRoom.prototype.sendPublicMessage = function(connection, message)
{
  var user = this.getUser(connection.broadcastId);
  var date = currentTime();
  var msg = new ChatMessage(user, message, date);
  this.history.unshift(msg);

  var json = JSON.stringify({type: 'clientmsg', date: date, username: user.getUsername(), message: message});
  sendToAllClients(json);
}

ChatRoom.prototype.sendUserList = function()
{
  var array = [];
  for(var i = 0; i<this.getUsers().length;i++)
  {
      var object = 
      {
        'username': this.getUsers()[i].getUsername(),
        'id': this.getUsers()[i].getId(),
      }
      array[i] = object;
  }




  var json = JSON.stringify({type: 'userlist', userlist: array});
  sendToAllClients(json);
}


ChatRoom.prototype.getLastMessages = function(count)
{
  return this.history.slice(0,count);
}

ChatRoom.prototype.clearMessageCache = function()
{
  this.history = [];
}

function ChatUser(username, id, connection) 
{
this.username = username;
this.connection = connection;
this.id = id;
}

ChatUser.prototype.getUsername = function()
{
  return this.username;
}

ChatUser.prototype.setUsername = function(username)
{
  this.username = username;
}

ChatUser.prototype.setId = function(id)
{
  this.id = id;
}

ChatUser.prototype.getId = function()
{
  return this.id;
}

ChatUser.prototype.getConnection = function()
{
  return this.connection;
}


function ChatMessage(user, message, date) 
{
this.owner = user;
this.message = message;
this.date = date;
}

ChatMessage.prototype.getOwner = function()
{
  return this.owner;
}

ChatMessage.prototype.getMessage = function()
{
  return this.message;
}

ChatMessage.prototype.getDate = function()
{
  return this.date;
}

var sendChallenge = function(connection, username)
{
  var chatuser = chatRoom.getUser(username);
  var opponent = chatuser.getConnection();
  //man ska inte kunna utmana sig själv.
  if(opponent != connection)
  {
    var json = JSON.stringify({type: 'challengereceived', username: chatRoom.getUser(connection.broadcastId).getUsername()});
    sendToClient(opponent,json);
    var json = JSON.stringify({type: 'challengesent', username: chatuser.getUsername()});
    sendToClient(connection,json);
  }
  else
  {
    var json = JSON.stringify({type: 'selfchallenge'});
    sendToClient(connection,json);
  }

}

var acceptChallenge = function(connection, username)
{
  //var chatuser1 = chatRoom.getUser(connection.broadcastId).getUsername();
  var connection2 = chatRoom.getUser(username).getConnection();
  var game = new TankGame(connection, connection2);
  activeGames.push(game);
  
  var json = JSON.stringify({type: 'startGame', playerx: 150, playery: 250, opponentx: 700, opponenty: 300});
  sendToClient(connection,json);
  
 var json = JSON.stringify({type: 'startGame', playerx: 700, playery: 300, opponentx: 150, opponenty: 250});
  sendToClient(connection2,json);
}


function TankGame(player1, player2) 
{
this.player1 = player1;
this.player2 = player2;
}

TankGame.prototype.getPlayerOne = function()
{
  return this.player1;
}
TankGame.prototype.getPlayerTwo = function()
{
  return this.player2;
}
var getOpponent = function(connection)
{
  for (var i=0; i<activeGames.length;i++)
  {
    if(activeGames[i].getPlayerOne() == connection)
      return activeGames[i].getPlayerTwo();
    else if(activeGames[i].getPlayerTwo() == connection)
      return activeGames[i].getPlayerOne();
  }
}
var sendLocs = function(connection, msg)
{
  var opponent = getOpponent(connection);
   
    sendToClient(opponent, msg);
}




