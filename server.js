var WebSocket = require('ws');

var WebSocketServer = WebSocket.Server;



var wss = new WebSocketServer({ port: 8080 });

var users = {};

function sendTo(connection, message) {
    connection.send(JSON.stringify(message));
}



//when a user connects to our sever
wss.on('connection', function (connection) {
    console.log("user connected");

    //when server gets a message from a connected user
    connection.on('message', function (message) {
        var data;

        try {

            data = JSON.parse(message);
        } catch (e) {
            console.log("Invalid JSON: ", e.message);
            data = {};
        }

        switch (data.type) {
            case "login":


                //if anyone is logged in with this username then refuse
                if (users[data.name]) {
                    sendTo(connection, {
                        type: "login",
                        success: false
                    });
                } else {
                    //save user connection on the server
                    console.log("User logged:", data.name);
                    users[data.name] = connection;
                    connection.name = data.name;

                    sendTo(connection, {
                        type: "login",
                        success: true
                    });

                }

                break;

            case "offer":
                //for ex. UserA wants to call UserB
                console.log("Sending offer to: ", data.name);

                //if UserB exists then send him offer details
                var conn = users[data.name];

                if (conn != null) {
                    //setting that UserA connected with UserB
                    connection.otherName = data.name;

                    sendTo(conn, {
                        type: "offer",
                        offer: data.offer,
                        descType: data.descType,
                        name: connection.name,
                        constraints: data.constraints
                    });
                }

                break;

            case "answer":
                console.log("Sending answer to ", data.name);
                var conn = users[data.name];

                if (conn != null) {
                    connection.otherName = data.name;
                    sendTo(conn, {
                        type: "answer",
                        answer: data.answer,
                        descType: data.descType,
                        constraints: data.constraints
                    });
                }
                break;
            case "candidate":
                console.log("Sending candidate to:", data.name);
                var conn = users[data.name];


                if (conn != null) {
                    sendTo(conn, {
                        type: "candidate",
                        candidate: data.candidate,
                        sdpMid: data.sdpMid,
                        sdpIndex: data.sdpIndex,

                    });
                }

                break;

            case "leave":
                if (connection.otherName != null) {
                    console.log("Disconnecting user: ", connection.name);


                    var keys = users.keys;
                    keys.forEach(element => {
                        if (users[element].otherName == connection.name) {
                            users[element].otherName = null;
                        }
                    });


                    sendTo(connection, { type: "leaving" });
                } else {
                    sendTo(connection, { error: "No connection" });
                }
                break;

            /*case "logout":
                var conn = users[data.name];

                if (conn != null) {
                    sendTo(conn, { type: "Logged out" });
                    delete users[data.name];
                }*/


            default:
                sendTo(connection, {
                    type: "error",
                    message: "Command no found: " + data.type
                });

                break;
        }
    });

    connection.on("close", function () {
        if (connection.name) {
            console.log("User has left: ", connection.name);
            delete users[connection.name];
        }
        if (connection.otherName) {
            console.log("Disconnecting from ", connection.otherName);
            var conn = users[connection.otherName];
            conn.otherName = null;

            if (conn != null) {
                sendTo(conn, {
                    type: "leave"
                });
            }
        }
    });

}); 
