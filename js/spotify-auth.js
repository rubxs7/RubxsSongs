const clientId = "38ee0a10def44f93aaf9a945965098dc";
const redirectUri = "https://rubxs7.github.io/RubxsSongs/";
const scopes = ["user-read-playback-state","user-modify-playback-state","streaming","user-library-read","user-read-private","playlist-read-private","playlist-read-collaborative"];

function generateRandomString(length) {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const values = crypto.getRandomValues(new Uint8Array(length));
  values.forEach(v => result += charset[v % charset.length]);
  return result;
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

function base64encode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function loginWithSpotify() {
  const verifier = generateRandomString(64);
  const challenge = base64encode(await sha256(verifier));

  sessionStorage.setItem("pkce_verifier", verifier);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes.join(" "),
    code_challenge_method: "S256",
    code_challenge: challenge
  });

  window.location.href = "https://accounts.spotify.com/authorize?" + params.toString();
}

function logoutSpotify() {
  localStorage.removeItem("spotify_token");
  localStorage.removeItem("spotify_exp");

  const loginDiv = document.getElementById("spotifyLogin");
  const logoutBtn = document.getElementById("spotifyLogout");
  const appDiv = document.getElementById("app");

  if (loginDiv) loginDiv.style.display = "flex";
  if (logoutBtn) logoutBtn.classList.add("is-hidden");
  if (appDiv) appDiv.classList.add("is-hidden");
}

async function exchangeCodeForToken(code) {
  const verifier = sessionStorage.getItem("pkce_verifier");

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const data = await response.json();

  sessionStorage.removeItem("pkce_verifier");
  localStorage.setItem("spotify_token", data.access_token);
  localStorage.setItem("spotify_exp", Date.now() + data.expires_in * 1000);

  window.history.replaceState({}, document.title, redirectUri);
}

function getValidToken() {
  const token = localStorage.getItem("spotify_token");
  const exp = localStorage.getItem("spotify_exp");

  if (!token || !exp) return null;
  if (Date.now() > exp) return null;

  return token;
}

function updateUIIfAuthenticated() {
  const token = getValidToken();
  if (!token) return;

  const loginDiv = document.getElementById("spotifyLogin");
  const logoutBtn = document.getElementById("spotifyLogout");
  const appDiv = document.getElementById("app");

  if (loginDiv) loginDiv.style.display = "none";
  if (logoutBtn) logoutBtn.classList.remove("is-hidden");
  if (appDiv) appDiv.classList.remove("is-hidden");
}


(async function initSpotifyAuth() {
  const token = getValidToken();
  if (token) {
    updateUIIfAuthenticated();
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (code) {
    await exchangeCodeForToken(code);
    updateUIIfAuthenticated();
  }
})();
