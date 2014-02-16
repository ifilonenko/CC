function Room(name, id, owner) {
  this.name = name;
  this.id = id;
  this.owner = owner;
  this.people = [];
  this.status = "available";
};

Room.prototype.addPerson = function(personID) {
  if (this.status === "available") {
    this.people.push(personID);
  }
};

module.exports = Room;
client.on("joinRoom", function(id) {
    var room = rooms[id];
    if (client.id === room.owner) {
      client.emit("update", "You are the owner of this room and you have already been joined.");
    } else {
      room.people.contains(client.id, function(found) {
          if (found) {
              client.emit("update", "You have already joined this room.");
          } else {
            if (people[client.id].inroom !== null) { //make sure that one person joins one room at a time
              client.emit("update", "You are already in a room ("+rooms[people[client.id].inroom].name+"), please leave it first to join another room.");
            } else {
          room.addPerson(client.id);
          people[client.id].inroom = id;
          client.room = room.name;
          client.join(client.room); //add person to the room
          user = people[client.id];
          socket.sockets.in(client.room).emit("update", user.name + " has connected to " + room.name + " room.");
          client.emit("update", "Welcome to " + room.name + ".");
          client.emit("sendRoomID", {id: id});
        }
          }
      });
    }
  });
console.log(socket.sockets.manager.roomClients[client.id]); 
//should return { '': true }
client.room = 'myroom';
client.join('myroom');
console.log(socket.sockets.manager.roomClients[client.id]); 
//should return { '': true, '/myroom': true }
client.on("send", function(msg) {
  if (socket.sockets.manager.roomClients[client.id]['/'+client.room] !== undefined ) {
    socket.sockets.in(client.room).emit("chat", people[client.id], msg);
  } else {
    client.emit("update", "Please connect to a room.");
  }
});
client.on("leaveRoom", function(id) {
  var room = rooms[id];
  if (client.id === room.owner) {
    var i = 0;
    while(i < clients.length) {
      if(clients[i].id == room.people[i]) {
        people[clients[i].id].inroom = null;
        clients[i].leave(room.name);
      }
      ++i;
    }
    delete rooms[id];
    people[room.owner].owns = null; //reset the owns object to null so new room can be added
    socket.sockets.emit("roomList", {rooms: rooms});
    socket.sockets.in(client.room).emit("update", "The owner (" +user.name + ") is leaving the room. The room is removed.");
  } else {
      room.people.contains(client.id, function(found) {
        if (found) { //make sure that the client is in fact part of this room
          var personIndex = room.people.indexOf(client.id);
          room.people.splice(personIndex, 1);
          socket.sockets.emit("update", people[client.id].name + " has left the room.");
          client.leave(room.name);
        }
     });
   }
});
client.on("removeRoom", function(id) {
    var room = rooms[id];
    if (room) {
      if (client.id === room.owner) { //only the owner can remove the room
        var personCount = room.people.length;
        if (personCount > 2) {
          console.log('there are still people in the room warning'); //This will be handled later
        }  else {
          if (client.id === room.owner) {
            socket.sockets.in(client.room).emit("update", "The owner (" +people[client.id].name + ") removed the room.");
            var i = 0;
            while(i < clients.length) {
              if(clients[i].id === room.people[i]) {
                people[clients[i].id].inroom = null;
                clients[i].leave(room.name);
              }
                ++i;
            }
                delete rooms[id];
                people[room.owner].owns = null;
            socket.sockets.emit("roomList", {rooms: rooms});

          }
        }
      } else {
        client.emit("update", "Only the owner can remove a room.");
      }
    }
});
client.on("disconnect", function() {
    if (people[client.id]) {
      if (people[client.id].inroom === null) {
        socket.sockets.emit("update", people[client.id].name + " has left the server.");
        delete people[client.id];
        socket.sockets.emit("update-people", people);
      } else {
        if (people[client.id].owns !== null) {
          var room= rooms[people[client.id].owns];
          if (client.id === room.owner) {
            var i = 0;
            while(i < clients.length) {
              if (clients[i].id === room.people[i]) {
                people[clients[i].id].inroom = null;
                clients[i].leave(room.name);
              }
                  ++i;
            }
            delete rooms[people[client.id].owns];
          }
        }
        socket.sockets.emit("update", people[client.id].name + " has left the server.");
        delete people[client.id];
        socket.sockets.emit("update-people", people);
        socket.sockets.emit("roomList", {rooms: rooms});
      }
    }
  });

You may have noticed that I'm using a function called contains to check whether a particular object contains an element. That is not a JavaScript built-in function (unfortunately) so I'm using the following implementation:

Array.prototype.contains = function(k, callback) {
    var self = this;
    return (function check(i) {
        if (i >= self.length) {
            return callback(false);
        }
        if (self[i] === k) {
            return callback(true);
        }
        return process.nextTick(check.bind(null, i+1));
    }(0));
};

