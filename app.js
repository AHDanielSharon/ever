const DB_KEY = "socionet-db-v1";
const state = {
  mode: "login",
  currentUserId: null,
  activeTab: "feed",
  activeChatUserId: null,
  installPrompt: null,
  map: null,
  mapLayers: {},
  trafficLayer: null,
  distanceMode: false,
  distancePoints: [],
  distancePolyline: null,
};

const defaults = { users: [], posts: [], stories: [], chats: [], reels: [] };
const $ = (id) => document.getElementById(id);
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

function loadDB() {
  const db = localStorage.getItem(DB_KEY);
  return db ? JSON.parse(db) : structuredClone(defaults);
}
function saveDB(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
function getUser(id) { return loadDB().users.find((u) => u.id === id); }
function avatar(url) { return url || "https://api.dicebear.com/8.x/shapes/svg?seed=" + Math.random().toString(36).slice(2); }
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setScreen(authenticated) {
  $("auth-screen").classList.toggle("active", !authenticated);
  $("main-screen").classList.toggle("active", authenticated);
}

function switchAuthMode(mode) {
  state.mode = mode;
  $("login-tab").classList.toggle("active", mode === "login");
  $("signup-tab").classList.toggle("active", mode === "signup");
  $("name-input").classList.toggle("hidden", mode === "login");
  $("avatar-input").classList.toggle("hidden", mode === "login");
}

async function authSubmit(e) {
  e.preventDefault();
  const db = loadDB();
  const email = $("email-input").value.trim().toLowerCase();
  const password = $("password-input").value;
  if (state.mode === "signup") {
    if (db.users.some((u) => u.email === email)) return alert("Email already in use.");
    const avatarFile = $("avatar-input").files[0];
    const avatarData = await fileToDataUrl(avatarFile);
    const user = {
      id: uid(),
      name: $("name-input").value.trim() || "User",
      email,
      password,
      avatar: avatar(avatarData),
      followers: [],
      following: [],
      createdAt: now(),
    };
    db.users.push(user);
    saveDB(db);
    state.currentUserId = user.id;
  } else {
    const user = db.users.find((u) => u.email === email && u.password === password);
    if (!user) return alert("Invalid login.");
    state.currentUserId = user.id;
  }
  localStorage.setItem("socionet-session", state.currentUserId);
  bootMain();
}

function logout() {
  state.currentUserId = null;
  localStorage.removeItem("socionet-session");
  setScreen(false);
}

function setTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  renderTab();
}

function renderTab() {
  const tpl = document.getElementById(`${state.activeTab}-template`);
  const content = $("content");
  content.innerHTML = "";
  content.append(tpl.content.cloneNode(true));

  if (state.activeTab === "feed") renderFeed();
  if (state.activeTab === "reels") renderReels();
  if (state.activeTab === "chat") renderChat();
  if (state.activeTab === "calls") renderCalls();
  if (state.activeTab === "maps") renderMap();
  if (state.activeTab === "profile") renderProfile();
}

function renderFeed() {
  const db = loadDB();
  const me = getUser(state.currentUserId);
  $("post-form").onsubmit = async (e) => {
    e.preventDefault();
    const mediaFile = $("media-file").files[0];
    const mediaType = mediaFile ? (mediaFile.type.startsWith("video") ? "video" : "image") : "";
    const mediaUrl = mediaFile ? await fileToDataUrl(mediaFile) : "";
    db.posts.unshift({
      id: uid(),
      userId: me.id,
      text: $("post-text").value,
      mediaUrl,
      mediaType,
      createdAt: now(),
    });
    saveDB(db);
    renderFeed();
  };
  $("story-form").onsubmit = async (e) => {
    e.preventDefault();
    const file = $("story-file").files[0];
    if (!file) return alert("Select image/video for story.");
    db.stories.unshift({
      id: uid(),
      userId: me.id,
      mediaUrl: await fileToDataUrl(file),
      mediaType: file.type.startsWith("video") ? "video" : "image",
      createdAt: now(),
    });
    saveDB(db);
    renderFeed();
  };

  const freshStories = db.stories.filter((s) => Date.now() - new Date(s.createdAt).getTime() < 24 * 3600 * 1000);
  $("stories").innerHTML = freshStories.length
    ? freshStories
        .map((s) => {
          const u = getUser(s.userId);
          const storyMedia = s.mediaType === "video"
            ? `<video class="avatar" src="${s.mediaUrl}" muted playsinline></video>`
            : `<img class="avatar" src="${s.mediaUrl}" />`;
          return `<article class="story">${storyMedia}<small>${u.name}</small></article>`;
        })
        .join("")
    : '<p class="hint">No stories yet.</p>';

  $("feed-list").innerHTML = db.posts
    .map((p) => {
      const u = getUser(p.userId);
      return `<article class="glass card">
        <div class="user-line"><div class="row"><img class="avatar" src="${u.avatar}" /><div><strong>${u.name}</strong><br/><small>${new Date(
          p.createdAt
        ).toLocaleString()}</small></div></div></div>
        <p>${p.text}</p>
        ${p.mediaType === "image" ? `<img class="post-media" src="${p.mediaUrl}"/>` : ""}
        ${p.mediaType === "video" ? `<video class="post-media" src="${p.mediaUrl}" controls></video>` : ""}
      </article>`;
    })
    .join("");
}

function renderReels() {
  const db = loadDB();
  $("reel-form").onsubmit = async (e) => {
    e.preventDefault();
    const reelFile = $("reel-file").files[0];
    if (!reelFile) return alert("Select a reel video.");
    db.reels.unshift({
      id: uid(),
      userId: state.currentUserId,
      title: $("reel-title").value,
      url: await fileToDataUrl(reelFile),
      createdAt: now(),
    });
    saveDB(db);
    renderReels();
  };
  $("reel-list").innerHTML = db.reels
    .map((r) => {
      const u = getUser(r.userId);
      return `<article class="glass card"><strong>${u.name}</strong><p>${r.title}</p><video class="reel-video" src="${r.url}" controls></video></article>`;
    })
    .join("");
}

function getChatKey(a, b) { return [a, b].sort().join(":"); }
function renderChat() {
  const db = loadDB();
  const me = getUser(state.currentUserId);
  const others = db.users.filter((u) => u.id !== me.id);
  const people = $("people-list");
  people.innerHTML = others.length
    ? others
        .map((u) => `<button class="btn person" data-id="${u.id}"><span>${u.name}</span><small>${u.email}</small></button>`)
        .join("")
    : '<p class="hint">No other users yet.</p>';
  people.querySelectorAll("button").forEach((b) => (b.onclick = () => { state.activeChatUserId = b.dataset.id; paintChat(); }));

  $("chat-form").onsubmit = async (e) => {
    e.preventDefault();
    if (!state.activeChatUserId) return alert("Select a user.");
    const key = getChatKey(me.id, state.activeChatUserId);
    const file = $("chat-file").files[0];
    const msg = {
      id: uid(),
      chatId: key,
      senderId: me.id,
      text: $("chat-input").value,
      fileName: file?.name || "",
      fileUrl: file ? await fileToDataUrl(file) : "",
      fileType: file?.type || "",
      createdAt: now(),
    };
    db.chats.push(msg);
    saveDB(db);
    $("chat-input").value = "";
    $("chat-file").value = "";
    paintChat();
  };

  function paintChat() {
    const target = getUser(state.activeChatUserId);
    $("chat-title").textContent = target ? `Messages with ${target.name}` : "Messages";
    if (!target) return ($("chat-log").innerHTML = '<p class="hint">Choose someone to chat.</p>');
    const key = getChatKey(me.id, target.id);
    const messages = loadDB().chats.filter((m) => m.chatId === key);
    $("chat-log").innerHTML = messages
      .map((m) => {
        const own = m.senderId === me.id;
        let attachment = "";
        if (m.fileUrl) {
          if (m.fileType.startsWith("image")) attachment = `<img class="post-media" src="${m.fileUrl}" />`;
          else if (m.fileType.startsWith("video")) attachment = `<video class="post-media" controls src="${m.fileUrl}"></video>`;
          else attachment = `<a href="${m.fileUrl}" download="${m.fileName}">📎 ${m.fileName}</a>`;
        }
        return `<div class="msg ${own ? "me" : ""}"><strong>${own ? "You" : target.name}:</strong> ${m.text}<div>${attachment}</div></div>`;
      })
      .join("");
  }
  paintChat();
}

function renderCalls() {
  $("call-form").onsubmit = (e) => {
    e.preventDefault();
    const room = encodeURIComponent($("call-room").value.trim());
    const frame = $("call-frame");
    frame.src = `https://meet.jit.si/${room}#config.prejoinPageEnabled=false`;
    frame.classList.remove("hidden");
  };
}

function renderMap() {
  const mapNode = $("map");
  if (state.map) {
    state.map.remove();
    state.map = null;
  }
  state.map = L.map(mapNode).setView([37.7749, -122.4194], 11);
  state.mapLayers = {
    street: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }),
    satellite: L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles © Esri" }
    ),
    terrain: L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", { attribution: "© OpenTopoMap" }),
  };
  state.mapLayers.street.addTo(state.map);

  const trafficBtn = $("traffic-toggle");
  const layerPicker = $("map-layer");
  const distanceBtn = $("distance-toggle");

  layerPicker.onchange = () => {
    Object.values(state.mapLayers).forEach((l) => state.map.removeLayer(l));
    state.mapLayers[layerPicker.value].addTo(state.map);
  };

  state.trafficLayer = L.tileLayer("https://tile.memomaps.de/tilegen/{z}/{x}/{y}.png", { attribution: "Traffic style" });
  let trafficOn = false;
  trafficBtn.onclick = () => {
    trafficOn = !trafficOn;
    if (trafficOn) state.trafficLayer.addTo(state.map);
    else state.map.removeLayer(state.trafficLayer);
  };

  state.distanceMode = false;
  state.distancePoints = [];
  if (state.distancePolyline) {
    state.map.removeLayer(state.distancePolyline);
    state.distancePolyline = null;
  }

  distanceBtn.onclick = () => {
    state.distanceMode = !state.distanceMode;
    distanceBtn.textContent = state.distanceMode ? "Distance: ON" : "Distance Tool";
    if (!state.distanceMode) {
      state.distancePoints = [];
      $("distance-result").textContent = "Distance: 0 km";
      if (state.distancePolyline) state.map.removeLayer(state.distancePolyline);
    }
  };

  state.map.on("click", (e) => {
    if (!state.distanceMode) return;
    state.distancePoints.push([e.latlng.lat, e.latlng.lng]);
    if (state.distancePolyline) state.map.removeLayer(state.distancePolyline);
    state.distancePolyline = L.polyline(state.distancePoints, { color: "#57e9ff" }).addTo(state.map);
    let distance = 0;
    for (let i = 1; i < state.distancePoints.length; i++) {
      distance += state.map.distance(state.distancePoints[i - 1], state.distancePoints[i]);
    }
    $("distance-result").textContent = `Distance: ${(distance / 1000).toFixed(2)} km`;
  });
}

function renderProfile() {
  const db = loadDB();
  const me = getUser(state.currentUserId);
  $("profile-card").innerHTML = `<div class="row"><img class="avatar" src="${me.avatar}" /><div><strong>${me.name}</strong><br/><small>${me.email}</small><br/><small>${me.followers.length} followers · ${me.following.length} following</small></div></div>`;

  $("profile-name").value = me.name;
  $("profile-avatar").value = "";
  $("profile-form").onsubmit = async (e) => {
    e.preventDefault();
    me.name = $("profile-name").value.trim();
    const avatarFile = $("profile-avatar").files[0];
    if (avatarFile) me.avatar = await fileToDataUrl(avatarFile);
    saveDB(db);
    bootMain();
  };

  $("directory").innerHTML = db.users
    .filter((u) => u.id !== me.id)
    .map((u) => {
      const following = me.following.includes(u.id);
      return `<div class="user-line"><div class="row"><img class="avatar" src="${u.avatar}" /><div><strong>${u.name}</strong><br/><small>${u.followers.length} followers</small></div></div>
      <button class="btn follow-btn" data-id="${u.id}">${following ? "Unfollow" : "Follow"}</button></div>`;
    })
    .join("");

  document.querySelectorAll(".follow-btn").forEach((btn) => {
    btn.onclick = () => {
      const target = db.users.find((u) => u.id === btn.dataset.id);
      const i = me.following.indexOf(target.id);
      if (i >= 0) {
        me.following.splice(i, 1);
        target.followers = target.followers.filter((id) => id !== me.id);
      } else {
        me.following.push(target.id);
        if (!target.followers.includes(me.id)) target.followers.push(me.id);
      }
      saveDB(db);
      renderProfile();
    };
  });
}

function bootMain() {
  setScreen(true);
  const me = getUser(state.currentUserId);
  $("user-badge").textContent = `${me.name} · ${me.email}`;
  setTab(state.activeTab);
}

function setupInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    state.installPrompt = e;
    $("install-btn").classList.remove("hidden");
  });
  $("install-btn").onclick = async () => {
    if (!state.installPrompt) return alert("Install prompt not available yet. Use browser menu to install.");
    state.installPrompt.prompt();
    await state.installPrompt.userChoice;
    state.installPrompt = null;
  };
}

function init() {
  switchAuthMode("login");
  $("login-tab").onclick = () => switchAuthMode("login");
  $("signup-tab").onclick = () => switchAuthMode("signup");
  $("auth-form").onsubmit = authSubmit;
  $("logout-btn").onclick = logout;
  document.querySelectorAll(".nav-btn").forEach((b) => (b.onclick = () => setTab(b.dataset.tab)));
  setupInstallPrompt();

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
  const session = localStorage.getItem("socionet-session");
  if (session && getUser(session)) {
    state.currentUserId = session;
    bootMain();
  } else {
    setScreen(false);
  }
}

init();
