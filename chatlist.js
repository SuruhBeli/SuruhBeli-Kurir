// ===== Firebase Config =====
firebase.initializeApp({
  apiKey: "AIzaSyByQl0BXZoSMzrULUNA6l7UVFQjXmvsdJE",
  authDomain: "suruhbeli-e8ae8.firebaseapp.com",
  projectId: "suruhbeli-e8ae8"
});

const db = firebase.firestore();
const auth = firebase.auth();
const chatListContainer = document.getElementById("chatListContainer");

// ===== IndexedDB Setup =====
let dbIDB;
const request = indexedDB.open("chatDB",1);
request.onupgradeneeded = e=>{
  dbIDB = e.target.result;
  if(!dbIDB.objectStoreNames.contains("chats")){
    dbIDB.createObjectStore("chats",{keyPath:"id"});
  }
};
request.onsuccess = e=>{ dbIDB = e.target.result; loadCachedChats(); };

// ===== Render Chat =====
function renderChat(chat){
  let el = document.getElementById("chat_"+chat.id);
  if(!el){
    el = document.createElement("div");
    el.classList.add("chat-item");
    el.id = "chat_"+chat.id;
    el.innerHTML = `
      <div class="chat-photo">${chat.initials||"U"}</div>
      <div class="chat-details">
        <div class="chat-top">
          <div class="chat-name">${chat.partnerName||"User"}</div>
          <div class="chat-time">${chat.timestamp?new Date(chat.timestamp).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}):"--:--"}</div>
        </div>
        <div class="chat-last-message">${chat.lastMessage||"Memuat pesan..."}</div>
      </div>
    `;
    el.addEventListener("click",()=>window.location.href=`chat.html?roomId=${chat.id}`);
    chatListContainer.appendChild(el);
  }else{
    el.querySelector(".chat-name").innerText = chat.partnerName;
    el.querySelector(".chat-photo").innerText = chat.initials||"U";
    el.querySelector(".chat-last-message").innerText = chat.lastMessage;
    if(chat.timestamp) el.querySelector(".chat-time").innerText = new Date(chat.timestamp).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  }
}

// ===== Load Cached Chats from IndexedDB =====
function loadCachedChats(){
  const tx = dbIDB.transaction("chats","readonly");
  const store = tx.objectStore("chats");
  const req = store.getAll();
  req.onsuccess = ()=> req.result.forEach(renderChat);
}

// ===== Save Chat to IndexedDB =====
function saveChat(chat){
  const tx = dbIDB.transaction("chats","readwrite");
  const store = tx.objectStore("chats");
  store.put(chat);
}

// ===== Auth & Realtime =====
auth.onAuthStateChanged(async user=>{
  if(!user) return window.location.href="login.html";
  const kurirDoc = await db.collection("kurir").doc(user.uid).get();
  if(!kurirDoc.exists) return window.location.href="login.html";
  const currentUser = user;

  db.collection("chatRooms").where(`participants.${currentUser.uid}`,"==",true)
    .onSnapshot(snapshot=>{
      snapshot.docChanges().forEach(async change=>{
        const doc = change.doc;
        const roomId = doc.id;
        const participants = doc.data().participants||{};
        const otherUserId = Object.keys(participants).find(uid=>uid!==currentUser.uid);

        // Nama partner realtime
        let partnerDoc = await db.collection("users").doc(otherUserId).get();
        if(!partnerDoc.exists) partnerDoc = await db.collection("kurir").doc(otherUserId).get();
        const partnerName = partnerDoc.exists?partnerDoc.data().name||partnerDoc.data().nama||"User":"User";
        const initials = partnerName.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();

        // Last message
        const msgSnap = await db.collection("chatRooms").doc(roomId).collection("messages").orderBy("createdAt","desc").limit(1).get();
        let lastMsg="Gambar / Stiker", ts=Date.now();
        if(!msgSnap.empty){
          const msg = msgSnap.docs[0].data();
          lastMsg = msg.text||"Gambar / Stiker";
          ts = msg.createdAt?.toDate?msg.createdAt.toDate():new Date(msg.createdAt);
        }

        const chatItem = {id:roomId, partnerName, initials, lastMessage:lastMsg, timestamp:ts};
        saveChat(chatItem);
        renderChat(chatItem);
      });
    });
});

/* === NAVBAR BAWAH === */
const navItems = document.querySelectorAll('.nav-item');
const navCircle = document.getElementById('navCircle');
document.querySelector('.navbar-bottom')
  .classList.toggle('gempa-mode');
  
function updateNavCircle(activeIndex) {
  const activeItem = navItems[activeIndex];
  if (!activeItem || !navCircle) return;

  // Hitung posisi center ikon relatif ke navbar
  const navbarRect = activeItem.parentElement.getBoundingClientRect();
  const icon = activeItem.querySelector('svg');
  const iconRect = icon.getBoundingClientRect();

  const centerX = iconRect.left + iconRect.width / 2 - navbarRect.left;

  navCircle.style.left = `${centerX - navCircle.offsetWidth / 2}px`;
  navCircle.style.transform = 'scale(1.15)';

  setTimeout(() => {
    navCircle.style.transform = 'scale(1)';
  }, 200);
}

// Inisialisasi tab aktif sesuai URL
let currentPage = window.location.pathname.split("/").pop() || 'index.html';
navItems.forEach((item, idx) => {
  if (item.dataset.href === currentPage) {
    item.classList.add('active');
    updateNavCircle(idx);
  }

  // Event klik
  item.addEventListener('click', (e) => {
    e.preventDefault();
    navItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    updateNavCircle(idx);

    setTimeout(() => {
      window.location.href = item.dataset.href;
    }, 250); // animasi bulatan selesai dulu
  });
});

// Update posisi saat resize / load
function updateActiveCircle() {
  const active = document.querySelector('.nav-item.active');
  if (active) {
    const idx = Array.from(navItems).indexOf(active);
    updateNavCircle(idx);
  }
}

window.addEventListener('resize', updateActiveCircle);
window.addEventListener('load', updateActiveCircle);
