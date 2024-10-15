package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"

	"golang.org/x/exp/rand"
)

type Message struct {
	User  string `json:"user"`
	Title string `json:"title"`
}

type DrawAction struct {
	User string  `json:"user"`
	Room string  `json:"room"`
	X    float64 `json:"x"`
	Y    float64 `json:"y"`
}

type Room struct {
	Name     string         `json:"name"`
	Messages []Message      `json:"messages"`
	Drawings []DrawAction   `json:"drawings"`
	Users    map[string]int `json:"users"`
	Word     string         `json:"word"`
	Drawer   string         `json:"drawer"`
}

var rooms = make(map[string]*Room)
var mutex = &sync.Mutex{}
var words = []string{"chat", "chameau", "train", "avion", "aztec", "Khödöö aj akhuin erkhlegch "}

func enableCors(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	(*w).Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func handler(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method == "POST" {
		var input struct {
			User    string  `json:"user"`
			Title   string  `json:"title"`
			Room    string  `json:"room"`
			Drawer  string  `json:"drawer"`
			Action  string  `json:"action"`
			Victory string  `json:"victory"`
			X       float64 `json:"x"`
			Y       float64 `json:"y"`
		}

		err := json.NewDecoder(r.Body).Decode(&input)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		mutex.Lock()
		defer mutex.Unlock()
		room, exists := rooms[input.Room]
		if !exists {
			room = &Room{Name: input.Room, Messages: []Message{}, Drawings: []DrawAction{}, Users: map[string]int{}, Drawer: input.User}
			rooms[input.Room] = room
		}
		if input.Action == "draw" {
			room.Drawings = append(room.Drawings, DrawAction{User: input.User, Room: input.Room, X: input.X, Y: input.Y})
		} else if input.Victory == "true" {
			// room.Messages = append(room.Messages, Message{User: input.User, Title: input.Title})
			room.Word = getRandomWord()
			room.Messages = append(room.Messages, Message{User: "Server", Title: input.User + " won the game"})
			room.Drawer = input.Drawer
			room.Users[input.User] += 1
			room.Drawings = []DrawAction{}
		} else if input.Title != "" {
			room.Messages = append(room.Messages, Message{User: input.User, Title: input.Title})
		} else {
			addUserToRoom(input.User, input.Room)
			if len(room.Messages) == 0 && len(room.Drawings) == 0 {
				room.Word = getRandomWord()
				fmt.Printf("Drawer: %s, Word: %s\n", input.User, room.Word)
			}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(room)
	} else {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
	}
}

func main() {
	fmt.Println("HTTP Server Running on port 9988...")
	http.HandleFunc("/", handler)
	err := http.ListenAndServe(":9988", nil)
	if err != nil {
		fmt.Println("Error starting server:", err)
	}
}

func addUserToRoom(username, roomName string) {
	room, exists := rooms[roomName]
	if !exists {
		room = &Room{Name: roomName, Users: map[string]int{username: 0}, Messages: []Message{}, Drawings: []DrawAction{}}
		rooms[roomName] = room
	} else {
		if _, userExists := room.Users[username]; !userExists {
			room.Users[username] = 0
		}
	}
}

func getRandomWord() string {
	return words[rand.Intn(len(words))]
}
