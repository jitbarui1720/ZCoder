import { useEffect, useState } from "react";
import logo from "../assets/zcoder-logo.png";
import { useNavigate } from "react-router";

const API_URL = import.meta.env.VITE_API_URL;

const languages = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
];

const HomePage = () => {
  const [username, setUsername] = useState("User");
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [rooms, setRooms] = useState([]); // State to store rooms
  const [error, setError] = useState(""); // State for error messages

  // Create Room form state
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [roomLanguage, setRoomLanguage] = useState("javascript");
  const [privacy, setPrivacy] = useState("public");

  // Join Room form state
  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinPassword, setJoinPassword] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    // Fetch rooms and username on component mount
    const fetchRooms = async () => {
      try {
        const res = await fetch(`${API_URL}/api/rooms`);
        if (!res.ok) {
          throw new Error("Failed to fetch rooms");
        }
        const data = await res.json();
        setRooms(data);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to fetch rooms"); // Use setError for error display
      }
    };
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    } else {
      // Redirect to login if no username
      navigate("/login");
    }
    fetchRooms();
  }, [navigate]);

  // Interactive effects for cards
  useEffect(() => {
    const cards = document.querySelectorAll(".room-card");
    cards.forEach((card) => {
      card.addEventListener("mouseenter", function () {
        this.style.transform = "translateY(-8px) scale(1.02)";
      });
      card.addEventListener("mouseleave", function () {
        this.style.transform = "translateY(0) scale(1)";
      });
    });
    const inputs = document.querySelectorAll("input, select");
    inputs.forEach((input) => {
      input.addEventListener("focus", function () {
        this.parentElement.style.transform = "translateY(-2px)";
      });
      input.addEventListener("blur", function () {
        this.parentElement.style.transform = "translateY(0)";
      });
    });
    return () => {
      cards.forEach((card) => {
        card.removeEventListener("mouseenter", null);
        card.removeEventListener("mouseleave", null);
      });
      inputs.forEach((input) => {
        input.removeEventListener("focus", null);
        input.removeEventListener("blur", null);
      });
    };
  }, [showCreate, showJoin]);

  const handleShowCreate = () => {
    setShowCreate(true);
    setShowJoin(false);
  };

  const handleShowJoin = () => {
    setShowJoin(true);
    setShowCreate(false);
  };

  const handleHideForms = () => {
    setShowCreate(false);
    setShowJoin(false);
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!roomName.trim()) {
      setError("Please enter a room name"); // Use setError for error display
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: roomName,
          description: roomDescription,
          language: roomLanguage,
          privacy: privacy,
          creator: username,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create room");
      }

      const data = await res.json();
      alert(
        `Room "${roomName}" created successfully!\nRoom ID: ${data.room._id}\nCreator: ${username}\n\nYou can share this ID with others to invite them.`
      );
      setTimeout(() => {
        navigate(
          `/coding?roomId=${data.room._id}&username=${encodeURIComponent(
            username
          )}&roomName=${encodeURIComponent(data.room.name)}`
        );
      }, 1500);
      handleHideForms();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to create room"); // Use setError for error display
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!joinRoomId.trim()) {
      setError("Please enter a room ID");
      return;
    }

    try {
      console.log(`Joining room with ID: ${joinRoomId}`); // Debug log
      const res = await fetch(
        `${API_URL}/api/rooms/join/${joinRoomId}`,
        {
          method: "GET",
        }
      );

      if (!res.ok) {
        const errorData = await res.json(); // Parse error response
        console.error("Error joining room:", errorData); // Debug log
        throw new Error(errorData.message || "Invalid room ID");
      }

      const data = await res.json(); // Parse successful response
      console.log("Room data received:", data); // Debug log
      alert(
        `Joining room: ${joinRoomId.toUpperCase()}\nUsername: ${username}\n\nConnecting to the coding room...`
      );

      navigate(
        `/coding?roomId=${data.room._id}&username=${encodeURIComponent(
          username
        )}&roomName=${encodeURIComponent(data.room.name)}`
      );
      handleHideForms();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to join room");
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      alert("Logged out successfully!");
      localStorage.removeItem("username");
      navigate("/login");
    }
  };

  return (
    <div className="py-2.5 md:py-0 m-[0_auto] animate-fadeIn 
      bg-linear-to-br from-[#6a9cff] via-[#7f8cff] to-[#a78bfa]
      font-['Segoe UI',Tahoma,Geneva,Verdana,sans-serif]
    ">
      <div className="
        max-w-210 m-auto
        flex justify-between items-center
        mb-7.5 p-[15px_25px] rounded-[15px]
        bg-[rgba(255,255,255,0.1)]
        border border-[rgba(255,255,255,0.2)]
        backdrop-blur-[10px]
      ">
        <div className="text-[18px] font-medium">
          Welcome back, <span>{username}</span>!
        </div>
        <button className="
          bg-[rgba(255,255,255,0.2)]
          border border-[rgba(255,255,255,0.3)]
          p-[8px_16px] rounded-lg cursor-pointer
          transition-all duration-300
          text-sm text-white
          hover:bg-[rgba(255,255,255,0.3)]
          hover:-translate-y-px
        " onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="text-center flex flex-col items-center mb-12.5">
        <img src={logo} alt="ZCoder Logo" 
          className="
            w-37.5 h-37.5
            rounded-full mb-7.5
            shadow-[0_10px_30px_rgba(0,0,0,0.3)]
            transition-transform duration-300
            hover:scale-105
          "
        />
        <h1 
          className="text-4xl md:text-5xl font-bold text-white mb-2.5
            text-shadow-[2px_2px_4px_rgba(0,0,0,0.3)]"
        >ZCODER</h1>
        <p 
          className="text-xl text-[rgba(255,255,255,0.9)]
            font-light tracking-[2px] uppercase"
        >Collaborate • Code • Conquer</p>
      </div>

      <div 
        className="max-w-210 m-auto p-6.25 md:p-10 bg-white mb-10 rounded-[20px]
          shadow-[0_15px_35px_rgba(0,0,0,0.1)]
          animate-slide-up [animation-delay:0.2s] [animation-fill-mode:both]"
      >
        <h2 
          className="text-[28px] font-semibold text-[#333] mb-5 text-center"
        >Welcome to ZCoder</h2>
        <p className="text-[16px] leading-[1.6] text-[#666] text-center mb-7.5">
          ZCoder is a collaborative coding platform where developers unite to
          create, learn, and innovate together. Join coding rooms, work on
          projects in real-time, share knowledge, and build amazing software
          with fellow developers from around the world. Whether you're a
          beginner looking to learn or an expert ready to mentor, ZCoder
          provides the perfect environment for collaborative programming.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 mt-7.5">
          <div className="
            bg-[linear-gradient(135deg,#f8f9ff_0%,#e8f0ff_100%)]
            p-6.25 rounded-[15px] text-center 
            border-2 border-transparent
            transition-all duration-300
            hover:-translate-y-1.25
            hover:border-[#667eea]
            hover:shadow-[0_10px_25px_rgba(102,126,234,0.2)]
          ">
            <div className="text-[40px] mb-3.75">🚀</div>
            <h3 className="text-lg font-semibold text-[#333] mb-2.5">Real-time Collaboration</h3>
            <p className="text-sm text-[#666] leading-[1.4]">
              Code together with multiple developers in real-time with live
              cursor tracking and instant synchronization.
            </p>
          </div>
          <div className="
            bg-[linear-gradient(135deg,#f8f9ff_0%,#e8f0ff_100%)]
            p-6.25 rounded-[15px] text-center 
            border-2 border-transparent
            transition-all duration-300
            hover:-translate-y-1.25
            hover:border-[#667eea]
            hover:shadow-[0_10px_25px_rgba(102,126,234,0.2)]
          ">
            <div className="text-[40px] mb-3.75">💡</div>
            <h3 className="text-lg font-semibold text-[#333] mb-2.5">Smart Code Editor</h3>
            <p className="text-sm text-[#666] leading-[1.4]">
              Advanced code editor with syntax highlighting, auto-completion,
              and intelligent suggestions.
            </p>
          </div>
          <div className="
            bg-[linear-gradient(135deg,#f8f9ff_0%,#e8f0ff_100%)]
            p-6.25 rounded-[15px] text-center 
            border-2 border-transparent
            transition-all duration-300
            hover:-translate-y-1.25
            hover:border-[#667eea]
            hover:shadow-[0_10px_25px_rgba(102,126,234,0.2)]
          ">
            <div className="text-[40px] mb-3.75">🌐</div>
            <h3 className="text-lg font-semibold text-[#333] mb-2.5">Multi-language Support</h3>
            <p className="text-sm text-[#666] leading-[1.4]">
              Support for 50+ programming languages including Python,
              JavaScript, Java, C++, and more.
            </p>
          </div>
          <div className="
            bg-[linear-gradient(135deg,#f8f9ff_0%,#e8f0ff_100%)]
            p-6.25 rounded-[15px] text-center 
            border-2 border-transparent
            transition-all duration-300
            hover:-translate-y-1.25
            hover:border-[#667eea]
            hover:shadow-[0_10px_25px_rgba(102,126,234,0.2)]
          ">
            <div className="text-[40px] mb-3.75">🔒</div>
            <h3 className="text-lg font-semibold text-[#333] mb-2.5">Secure Rooms</h3>
            <p className="text-sm text-[#666] leading-[1.4]">
              Private and public rooms with customizable permissions and secure
              code sharing.
            </p>
          </div>
        </div>
      </div>

      <div className="
        max-w-210 m-auto p-6.25 md:p-10
        bg-white rounded-[20px]
        shadow-[0_15px_35px_rgba(0,0,0,0.1)]
        animate-slide-up [animation-delay:0.4s] [animation-fill-mode:both]
      ">
        <h2 className="text-[28px] font-semibold text-[#333] mb-7.5 text-center">Get Started with Coding Rooms</h2>
        <div className="bg-[rgba(102,126,234,0.1)] p-3.75 rounded-[10px] mb-5 text-center">
          Coding as: <strong className="text-[#667eea] text-lg">{username}</strong>
        </div>
        {error && (
          <div className="
            text-[#d32f2f] mt-3 font-semibold max-w-300
            w-full text-center bg-[#ffebee] p-2.5
            rounded-sm border border-[#f5c6c6]
          ">{error}</div> // Display error message
        )}
        <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-7.5 mb-7.5">
          <div className="
            bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)]
            p-7.5 rounded-[15px] text-white text-center
            transition-all duration-300
            cursor-pointer
            hover:-translate-y-1.25
            hover:shadow-[0_15px_30px_rgba(102,126,234,0.4)]
          " onClick={handleShowCreate}>
            <div className="text-5xl mb-5 opacity-80">➕</div>
            <h3 className="text-2xl mb-3.75 font-semibold">Create Room</h3>
            <p className="text-[16px] opacity-90 mb-5 leading-normal">
              Start a new coding session and invite others to collaborate on
              your project. Set up your workspace with custom settings and
              privacy options.
            </p>
          </div>
          <div className="
            bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)]
            p-7.5 rounded-[15px] text-white text-center
            transition-all duration-300
            cursor-pointer
            hover:-translate-y-1.25
            hover:shadow-[0_15px_30px_rgba(102,126,234,0.4)]
          " onClick={handleShowJoin}>
            <div className="text-5xl mb-5 opacity-80">🚪</div>
            <h3 className="text-2xl mb-3.75 font-semibold">Join Room</h3>
            <p className="text-[16px] opacity-90 mb-5 leading-normal">
              Enter an existing coding room using a room ID or invitation link.
              Jump into ongoing projects and start collaborating immediately.
            </p>
          </div>
        </div>

        {/* Create Room Form */}
        {showCreate && (
          <form
            className="bg-[#f8f9ff] p-7.5 rounded-[15px] mt-20px block animate-slide-down "
            onSubmit={handleCreateRoom}
          >
            <h3 className="mb-5 text-[#333]">Create New Room</h3>
            <div className="mb-5">
              <label className="
                block mb-2 font-bold text-[#333]
              " htmlFor="room-name">Room Name</label>
              <input
                className="w-full p-[12px_16px] border-2 border-[#e1e1e1]
                  rounded-[10px] text-[16px] bg-white
                  transition-all duration-300
                  focus:outline-none
                  focus:border-[#667eea]
                  shadow-[0_0_0_3px_rgba(102,126,234,0.1)]"
                type="text"
                id="room-name"
                placeholder="Enter room name (e.g., 'Python Study Group')"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
            </div>
            <div className="mb-5">
              <label className="
                block mb-2 font-bold text-[#333]
              " htmlFor="room-description">Description (Optional)</label>
              <input
                className="w-full p-[12px_16px] border-2 border-[#e1e1e1]
                  rounded-[10px] text-[16px] bg-white
                  transition-all duration-300
                  focus:outline-none
                  focus:border-[#667eea]
                  shadow-[0_0_0_3px_rgba(102,126,234,0.1)]"
                type="text"
                id="room-description"
                placeholder="Brief description of the room purpose"
                value={roomDescription}
                onChange={(e) => setRoomDescription(e.target.value)}
              />
            </div>
            <div className="mb-5">
              <label className="
                block mb-2 font-bold text-[#333]
              " htmlFor="room-language">Primary Language</label>
              <select
                id="room-language"
                value={roomLanguage}
                onChange={(e) => setRoomLanguage(e.target.value)}
                className="w-full p-[12px_16px]
                  border-2 border-[#e1e1e1] rounded-[10px]
                  text-[16px] bg-white"
              >
                {languages.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-5">
              <label className="
                block mb-2 font-bold text-[#333]
              ">Room Privacy</label>
              <div className="flex gap-5 mt-2.5">
                <label
                  className="flex items-center gap-2 font-normal"
                >
                  <input
                    type="radio"
                    name="privacy"
                    value="public"
                    checked={privacy === "public"}
                    onChange={() => setPrivacy("public")}
                  />
                  Public (Anyone can join)
                </label>
                <label
                  className="flex items-center gap-2 font-normal"
                >
                  <input
                    type="radio"
                    name="privacy"
                    value="private"
                    checked={privacy === "private"}
                    onChange={() => setPrivacy("private")}
                  />
                  Private (Invite only)
                </label>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-3.75 justify-center">
              <button className="
                p-[12px_24px] border-none rounded-[10px]
                text-[16px] font-semibold cursor-pointer
                transition-all duration-300
                bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)]
                text-white
                hover:-translate-y-0.5
                hover:shadow-[0_5px_15px_rgba(102,126,234,0.4)]
              " type="submit">
                Create Room
              </button>
              <button
                className="
                  p-[12px_24px] border-none rounded-[10px]
                  text-[16px] font-semibold cursor-pointer
                  transition-all duration-300
                  text-[#666] bg-[#f1f1f1]
                  hover:bg-[#e1e1e1]
                  hover:-translate-y-0.5
                " type="button"
                onClick={handleHideForms}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Join Room Form */}
        {showJoin && (
          <form
            id="join-room-form"
            className="bg-[#f8f9ff] p-7.5 rounded-[15px] mt-20px block animate-slide-down "
            onSubmit={handleJoinRoom}
          >
            <h3 className="mb-5 text-[#333]">
              Join Existing Room
            </h3>
            <div className="mb-5">
              <label className="
                block mb-2 font-bold text-[#333]
              " htmlFor="room-id">Room ID or Invitation Code</label>
              <input
                className="w-full p-[12px_16px] border-2 border-[#e1e1e1]
                  rounded-[10px] text-[16px] bg-white
                  transition-all duration-300
                  focus:outline-none
                  focus:border-[#667eea]
                  shadow-[0_0_0_3px_rgba(102,126,234,0.1)]"
                type="text"
                id="room-id"
                placeholder="Enter room ID (e.g., 'ABC123' or invitation link)"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
              />
            </div>
            <div className="mb-5">
              <label className="
                block mb-2 font-bold text-[#333]
              " htmlFor="join-password">Room Password (if required)</label>
              <input
                className="w-full p-[12px_16px] border-2 border-[#e1e1e1]
                  rounded-[10px] text-[16px] bg-white
                  transition-all duration-300
                  focus:outline-none
                  focus:border-[#667eea]
                  shadow-[0_0_0_3px_rgba(102,126,234,0.1)]"
                type="password"
                id="join-password"
                placeholder="Enter room password if private"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
              />
            </div>
            <div className="flex flex-col md:flex-row gap-3.75 justify-center">
              <button className="
                p-[12px_24px] border-none rounded-[10px]
                text-[16px] font-semibold cursor-pointer
                transition-all duration-300
                bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)]
                text-white
                hover:-translate-y-0.5
                hover:shadow-[0_5px_15px_rgba(102,126,234,0.4)]
              " type="submit">
                Join Room
              </button>
              <button
                className="
                  p-[12px_24px] border-none rounded-[10px]
                  text-[16px] font-semibold cursor-pointer
                  transition-all duration-300
                  text-[#666] bg-[#f1f1f1]
                  hover:bg-[#e1e1e1]
                  hover:-translate-y-0.5
                " type="button"
                onClick={handleHideForms}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Room List Display */}
        {rooms.length > 0 && (
          <div className="
            mt-12 bg-white p-7.5
            rounded-[20px]            
            shadow-[0_15px_35px_rgba(0,0,0,0.1)]
            animate-slide-up
            [animation-delay:0.6s]
            [animation-fill-mode:both]
          ">
            <h3 className="text-[26px] font-semibold text-[#333] mb-6 text-center">Available Rooms</h3>
            <ul className="flex flex-col gap-5">
              {rooms.map((room) => (
                <li key={room._id} className="
                  flex flex-col md:flex-row
                  md:items-center md:justify-between
                  gap-4 p-5
                  rounded-[15px]
                  bg-[linear-gradient(135deg,#f8f9ff_0%,#e8f0ff_100%)]
                  border-2 border-transparent
                  transition-all duration-300
                  hover:-translate-y-1
                  hover:border-[#667eea]
                  hover:shadow-[0_10px_25px_rgba(102,126,234,0.2)]
                ">
                  <span className="text-lg font-semibold text-[#333]">{room.name}</span>
                  <span className="text-sm text-[#666] leading-normal max-w-xl">{room.description || "No description provided"}</span>
                  <button
                    className="
                      self-start md:self-auto
                      px-6 py-2.5
                      rounded-[10px]
                      text-sm font-semibold
                      text-white
                      cursor-pointer
                      bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)]
                      transition-all duration-300
                      hover:-translate-y-0.5
                      hover:shadow-[0_5px_15px_rgba(102,126,234,0.4)]
                    "
                    onClick={() => {
                      navigate(
                        `/coding?roomId=${
                          room._id
                        }&username=${encodeURIComponent(
                          username
                        )}&roomName=${encodeURIComponent(room.name)}`
                      );
                    }}
                  >
                    Join
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
