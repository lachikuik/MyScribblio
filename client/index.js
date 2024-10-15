let username = "";
let room = "";
let isDrawer = false;
let lastX = 0, lastY = 0;
const url = new URL("http://localhost:9988");
let word = "";
let oldword = [];
const wordDiv = document.getElementById("word");

function joinRoom() {
    username = document.getElementById("username").value;
    room = document.getElementById("room").value;
    if (username && room) {
        document.getElementById("login").style.display = "none";
        document.getElementById("chat").style.display = "block";
        document.getElementById("room-name").innerText = "Room: " + room;
        setInterval(function(){
            loadMessages();
        }, 1000);

        fetch(url, {
            method: "POST",
            body: JSON.stringify({
                user: username,
                title: "",
                room: room
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        })
        .then(response => response.json())
        .then(roomData => {
            if (roomData.messages.length === 0 && roomData.drawings.length === 0) {
                isDrawer = roomData.drawer === username;
                sendDrawerMessage();
                initDrawing();
                showDrawerCanvas();
                document.getElementById("word").innerHTML = `<h3>Your word to draw: ${roomData.word}</h3>`;
                word = roomData.word
            } else {
                initViewingCanvas();
                word = roomData.word
            }
        });
    }
}

function showDrawerCanvas() {
    document.getElementById('drawerCanvasHeader').style.display = 'flex';
    document.getElementById('drawingCanvas').style.display = 'flex';
    document.getElementById('viewerCanvasHeader').style.display = 'none';
    document.getElementById('viewingCanvas').style.display = 'none';
}

function loadMessages() {
    fetch(url, {
        method: "POST",
        body: JSON.stringify({
            user: username,
            title: "",
            room: room,
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
    .then(response => response.json())
    .then(roomData => {
        const messageDiv = document.getElementById("messages");
        messageDiv.innerHTML = "";
        word = roomData.word;
        const oldIsDrawer = isDrawer;
        isDrawer = roomData.drawer === username;
        roomData.messages.forEach(msg => {
            messageDiv.innerHTML += `<p><strong>${msg.user}:</strong> ${msg.title}</p>`;
        });

        const usersDiv = document.getElementById("users");
        usersDiv.innerHTML = "<h3>Connected Users (with Scores):</h3><ul>";
        for (let user in roomData.users) {
            const score = roomData.users[user];
            usersDiv.innerHTML += `<li>${user} (Score: ${score})</li>`;
        }
        usersDiv.innerHTML += "</ul>";
        if (oldIsDrawer && !isDrawer) {
            console.log("axike");
            isDrawer = false;
            initViewingCanvas();
            word = roomData.word
            document.getElementById("word").innerHTML = ``;
            clearDrawing();
        }

        if (isDrawer) {
            wordDiv.innerHTML = `<h3>Your word to draw: ${roomData.word}</h3>`;
        }
        if (!isDrawer && Array.isArray(roomData.drawings)) {
            wordDiv.innerHTML = ``;
            const viewingCanvas = document.getElementById('viewingCanvas');
            const ctx = viewingCanvas.getContext('2d');
            ctx.clearRect(0, 0, viewingCanvas.width, viewingCanvas.height);
            roomData.drawings.forEach((drawAction, index) => {
                if (index > 0) {
                    const prevDrawAction = roomData.drawings[index - 1];
                    ctx.beginPath();
                    ctx.moveTo(prevDrawAction.x, prevDrawAction.y);
                    ctx.lineTo(drawAction.x, drawAction.y);
                    ctx.stroke();
                }
            });
        }
    })
    .catch(error => {
        console.error("Erreur lors de la recuperation des donnees de la room:", error);
    });
}



function sendDrawerMessage() {
    fetch(url, {
        method: "POST",
        body: JSON.stringify({
            user: "Server",
            title: `${username} is the drawer`,
            room: room
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    });
}

function send() {
    const textArea = document.getElementById("text");
    const message = textArea.value;
    if(message == word && isDrawer == false){
        if (message) {
            fetch(url, {
                method: "POST",
                body: JSON.stringify({
                    user: username,
                    title: message,
                    room: room,
                    victory: "true",
                    drawer: username
                }),
                headers: {
                    "Content-type": "application/json; charset=UTF-8"
                }
            })
            .then(response => response.json())
            .then(roomData => {
                const messageDiv = document.getElementById("messages");
                messageDiv.innerHTML = "";
                roomData.messages.forEach(msg => {
                    messageDiv.innerHTML += `<p><strong>${msg.user}:</strong> ${msg.title}</p>`;
                });
                sendDrawerMessage();
                initDrawing();
                showDrawerCanvas();
                document.getElementById("word").innerHTML = `<h3>Your word to draw: ${roomData.word}</h3>`;
                textArea.value = "";
            });
        }
    }
    if (message) {
        fetch(url, {
            method: "POST",
            body: JSON.stringify({
                user: username,
                title: message,
                room: room,
                victory :"false"
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        })
            .then(response => response.json())
            .then(roomData => {
                const messageDiv = document.getElementById("messages");
                messageDiv.innerHTML = "";
                roomData.messages.forEach(msg => {
                    messageDiv.innerHTML += `<p><strong>${msg.user}:</strong> ${msg.title}</p>`;
                });
            });
        textArea.value = "";
    }
}

function initDrawing() {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    let drawing = false;
    canvas.addEventListener('mousedown', (event) => {
        drawing = true;
        const rect = canvas.getBoundingClientRect();
        lastX = event.clientX - rect.left;
        lastY = event.clientY - rect.top;
    });

    canvas.addEventListener('mouseup', () => drawing = false);

    canvas.addEventListener('mousemove', (event) => {
        if (!drawing) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();

        fetch(url, {
            method: "POST",
            body: JSON.stringify({
                user: username,
                room: room,
                action: 'draw',
                x: x,
                y: y
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        });
        lastX = x;
        lastY = y;
    });
}

function initViewingCanvas() {
    document.getElementById('drawerCanvasHeader').style.display = 'none';
    document.getElementById('drawingCanvas').style.display = 'none';
    document.getElementById('viewerCanvasHeader').style.display = 'flex';
    document.getElementById('viewingCanvas').style.display = 'flex';
}

function clearDrawing() {
    fetch(url, {
        method: "POST",
        body: JSON.stringify({
            user: username,
            room: room,
            action: 'clear_drawing'
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
    .then(response => response.json())
    .then(roomData => {
        // Nettoyer le canvas côté client
        const canvas = document.getElementById('drawingCanvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    })
    .catch(error => {
        console.error("Erreur lors de la suppression des dessins:", error);
    });
}