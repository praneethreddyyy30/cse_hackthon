// Reels Recommendation Agent - Controller Logic

// Active session state
let sessionHistory = {};
let currentReelIndex = 0;
let apiKey = ""; // Hardcoded default Gemini API Key (empty for Offline-first by default)
let originalReelsCount = 8; // Track original seed reels count to clear recommendations on reset

// YouTube Iframe Player API caches and volume management
window.ytPlayers = {};
window.isMuted = true;

// Toggle Mute State globally across all players
window.toggleMuteState = function() {
  window.isMuted = !window.isMuted;
  const btns = document.querySelectorAll(".mute-toggle-btn");
  btns.forEach(btn => {
    btn.textContent = window.isMuted ? "🔇" : "🔊";
    btn.classList.toggle("unmuted-active", !window.isMuted);
  });
  
  // Apply mute/unmute to current active player
  const activeReel = INPUT_REELS[currentReelIndex];
  if (activeReel) {
    // YouTube Player API
    if (window.ytPlayers[activeReel.id]) {
      const player = window.ytPlayers[activeReel.id];
      if (player && typeof player.mute === "function") {
        try {
          if (window.isMuted) {
            player.mute();
          } else {
            player.unMute();
            player.setVolume(100);
          }
        } catch (e) {
          console.warn("Could not toggle mute status on player", e);
        }
      }
    }
    // Native HTML5 Video Element
    const nativeVid = document.getElementById(`native_video_${activeReel.id}`);
    if (nativeVid) {
      nativeVid.muted = window.isMuted;
    }
  }
};

// Debounce and active recommendation caches
let recommendTimeout = null;
window.activeRecommendations = [];
let scrollObserver = null;
let activeCommentReelId = null;

// Supported Categories for Interest DNA Profiling
const CORE_CATEGORIES = ["AI", "DSA", "Java", "HLD", "Cybersecurity", "Cloud", "Hardware", "Career", "Entertainment", "Gaming"];

// Initialize Application on window load
window.addEventListener("DOMContentLoaded", () => {
  // Capture the original feed length before any dynamic recommendation injection
  originalReelsCount = INPUT_REELS.length;

  // Clear outdated localStorage states if app version has changed to prevent out-of-bounds/schema conflicts
  const CURRENT_APP_VERSION = "23";
  const savedVersion = localStorage.getItem("reelfocus_app_version");
  if (savedVersion !== CURRENT_APP_VERSION) {
    console.warn("New app version detected (v23). Clearing old localStorage cache to prevent conflicts.");
    const apiKeyBackup = localStorage.getItem("gemini_api_key");
    localStorage.clear();
    if (apiKeyBackup) {
      localStorage.setItem("gemini_api_key", apiKeyBackup);
    }
    localStorage.setItem("reelfocus_app_version", CURRENT_APP_VERSION);
  }

  // Load saved API key if present, otherwise use default
  const savedKey = localStorage.getItem("gemini_api_key");
  if (savedKey) {
    apiKey = savedKey;
  }
  
  const keyField = document.getElementById("apiKeyField");
  if (keyField) {
    keyField.value = apiKey;
  }
  updateApiStatusUI(!!apiKey);

  // Load the saved active preset or fall back to the default "Built-in Trap"
  const savedPreset = localStorage.getItem("reelfocus_active_preset") || "built_in_trap";
  const presetDropdown = document.getElementById("presetSelect");
  if (presetDropdown) {
    presetDropdown.value = savedPreset;
  }
  loadPreset(savedPreset);
  
  // Initialize drag-to-scroll for desktop mouse navigation
  initDragScroll();
});

// Drag to scroll helper for mouse actions
function initDragScroll() {
  const container = document.getElementById("phoneScrollContainer");
  if (!container) return;
  
  let isDown = false;
  let startX, startY;
  let scrollTop;
  let startTime;
  
  container.addEventListener("mousedown", (e) => {
    // If clicking buttons, slider controls, comments list, search panels, or AI overlay card, bypass drag scroll
    if (
      e.target.closest(".phone-actions-sidebar") || 
      e.target.closest(".phone-bottom-controls") || 
      e.target.closest(".phone-comments-drawer") ||
      e.target.closest(".feed-nav-bar") ||
      e.target.closest(".ai-recommendation-overlay-card")
    ) {
      return;
    }
    isDown = true;
    startX = e.pageX;
    startY = e.pageY - container.offsetTop;
    scrollTop = container.scrollTop;
    startTime = Date.now();
  });
  
  container.addEventListener("mouseleave", () => {
    isDown = false;
  });
  
  container.addEventListener("mouseup", (e) => {
    if (!isDown) return;
    isDown = false;
    
    // Calculate displacement to check if it's a tap/click or drag
    const endY = e.pageY - container.offsetTop;
    const dist = Math.hypot(e.pageX - startX, endY - startY);
    const duration = Date.now() - startTime;
    
    if (dist < 10 && duration < 300) {
      togglePlayPause();
    }
  });
  
  container.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const y = e.pageY - container.offsetTop;
    const walk = (y - startY) * 1.5;
    container.scrollTop = scrollTop - walk;
  });
}

// Toggle active video player play/pause state
function togglePlayPause() {
  const activeReel = INPUT_REELS[currentReelIndex];
  if (!activeReel) return;
  
  // 1. YouTube Player
  const player = window.ytPlayers[activeReel.id];
  if (player && typeof player.getPlayerState === "function") {
    try {
      const state = player.getPlayerState();
      if (state === 1) { // playing
        player.pauseVideo();
        showPlayOverlay(activeReel.id, true);
      } else { // paused/ended/unstarted
        player.playVideo();
        showPlayOverlay(activeReel.id, false);
      }
      return;
    } catch (e) {
      console.warn("Could not toggle play/pause via player state", e);
    }
  }
  
  // 2. Native HTML5 Video Element
  const nativeVid = document.getElementById(`native_video_${activeReel.id}`);
  if (nativeVid) {
    if (nativeVid.paused) {
      nativeVid.play().catch(e => {});
      showPlayOverlay(activeReel.id, false);
    } else {
      nativeVid.pause();
      showPlayOverlay(activeReel.id, true);
    }
  }
}

// Show/hide play overlay button in center of viewport and sync sidebar controls
function showPlayOverlay(reelId, isPaused) {
  const overlay = document.getElementById(`play_overlay_${reelId}`);
  if (overlay) {
    if (isPaused) {
      overlay.classList.add("visible");
    } else {
      overlay.classList.remove("visible");
    }
  }

  // Update the play/pause button in the actions sidebar
  const slide = document.getElementById(`slide_${reelId}`);
  if (slide) {
    const btn = slide.querySelector(".play-pause-toggle-btn");
    const label = slide.querySelector(".play-pause-label");
    if (btn && label) {
      if (isPaused) {
        btn.textContent = "▶️";
        label.textContent = "Play";
        btn.classList.add("paused-active");
      } else {
        btn.textContent = "⏸️";
        label.textContent = "Pause";
        btn.classList.remove("paused-active");
      }
    }
  }
}

// Switch view tabs
function switchTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.remove("active");
  });
  document.querySelectorAll(".tab-content").forEach(content => {
    content.classList.remove("active");
  });

  // Find button corresponding to tab and activate
  const activeBtn = Array.from(document.querySelectorAll(".tab-btn")).find(btn => 
    btn.getAttribute("onclick").includes(tabId)
  );
  if (activeBtn) activeBtn.classList.add("active");

  const activeContent = document.getElementById(`tab-${tabId}`);
  if (activeContent) activeContent.classList.add("active");
}

// Modal handling for API Settings
function openApiModal() {
  document.getElementById("apiModal").classList.add("active");
}

// Close credentials Modal
function closeApiModal() {
  document.getElementById("apiModal").classList.remove("active");
}

function saveApiKey() {
  const value = document.getElementById("apiKeyField").value.trim();
  if (value) {
    apiKey = value;
    localStorage.setItem("gemini_api_key", apiKey);
    updateApiStatusUI(true);
  } else {
    clearApiKey();
  }
  closeApiModal();
}

function clearApiKey() {
  apiKey = "";
  localStorage.removeItem("gemini_api_key");
  document.getElementById("apiKeyField").value = "";
  updateApiStatusUI(false);
  closeApiModal();
}

function updateApiStatusUI(hasKey) {
  const dot = document.getElementById("statusDot");
  const text = document.getElementById("statusText");
  if (hasKey) {
    dot.className = "status-dot online";
    text.textContent = "Live Gemini Agent Active";
  } else {
    dot.className = "status-dot";
    text.textContent = "Local Engine (Offline)";
  }
}

/**
 * Loads a pre-defined scrolling preset.
 */
function loadPreset(presetKey) {
  // Truncate any dynamically injected recommended reels from previous runs
  if (typeof originalReelsCount !== "undefined" && INPUT_REELS.length > originalReelsCount) {
    INPUT_REELS.length = originalReelsCount;
  }

  const savedStateKey = `reelfocus_state_${presetKey}`;
  const savedState = localStorage.getItem(savedStateKey);
  
  if (savedState) {
    try {
      sessionHistory = JSON.parse(savedState) || {};
      if (typeof sessionHistory !== "object") {
        sessionHistory = {};
      }
      console.log(`Loaded saved state for preset "${presetKey}" from localStorage.`);
      
      // Ensure all input reels have a record
      INPUT_REELS.forEach(reel => {
        if (!sessionHistory[reel.id]) {
          sessionHistory[reel.id] = {
            reel_id: reel.id,
            watch_time: 0,
            liked: false,
            saved: false,
            shared: false,
            loops: 1,
            comments: []
          };
        }
      });
      
      const savedIndex = localStorage.getItem("reelfocus_current_index");
      if (savedIndex) {
        currentReelIndex = parseInt(savedIndex, 10);
        if (isNaN(currentReelIndex) || currentReelIndex >= INPUT_REELS.length || currentReelIndex < 0) {
          currentReelIndex = 0;
        }
      } else {
        currentReelIndex = 0;
      }
      
      renderFeedSlides();
      
      setTimeout(() => {
        const container = document.getElementById("phoneScrollContainer");
        if (container) {
          container.scrollTop = currentReelIndex * 512;
          setActiveReel(currentReelIndex);
        }
      }, 100);
      return;
    } catch (e) {
      console.warn("Failed to parse saved preset state, loading fresh.", e);
    }
  }

  if (presetKey === "custom") {
    // Try to load from localStorage first for persistent history
    const savedCustom = localStorage.getItem("reelfocus_custom_history");
    if (savedCustom) {
      try {
        sessionHistory = JSON.parse(savedCustom) || {};
        if (typeof sessionHistory !== "object") {
          sessionHistory = {};
        }
      } catch (e) {
        sessionHistory = {};
      }
    } else {
      sessionHistory = {};
    }
    
    // Ensure all input reels have a record
    INPUT_REELS.forEach(reel => {
      if (!sessionHistory[reel.id]) {
        sessionHistory[reel.id] = {
          reel_id: reel.id,
          watch_time: 0,
          liked: false,
          saved: false,
          shared: false,
          loops: 1,
          comments: []
        };
      }
    });
    currentReelIndex = 0;
  } else {
    const preset = PRESETS[presetKey];
    if (!preset) return;

    // Load preset interactions
    sessionHistory = {};
    
    // Default initialize all reels first so they are present in state
    INPUT_REELS.forEach(reel => {
      sessionHistory[reel.id] = {
        reel_id: reel.id,
        watch_time: 0,
        liked: false,
        saved: false,
        shared: false,
        loops: 1,
        comments: []
      };
    });

    // Layer preset data on top
    preset.history.forEach(item => {
      sessionHistory[item.reel_id] = {
        reel_id: item.reel_id,
        watch_time: item.watch_time,
        liked: item.liked,
        saved: item.saved,
        shared: item.shared,
        loops: item.loops,
        comments: item.comment ? [item.comment] : []
      };
    });

    // Find index of the first reel in the preset
    const firstReelId = preset.history[0]?.reel_id;
    const foundIndex = INPUT_REELS.findIndex(r => r.id === firstReelId);
    currentReelIndex = foundIndex !== -1 ? foundIndex : 0;
  }

  // Render slides, observer scroll snaps, and load active frame
  renderFeedSlides();
  
  // Center slide positioning
  setTimeout(() => {
    const activeSlide = document.getElementById(`slide_${INPUT_REELS[currentReelIndex].id}`);
    if (activeSlide) {
      activeSlide.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    setActiveReel(currentReelIndex);
  }, 100);

  recalculateDNA();
}

/**
 * Reset all active interactions
 */
function resetSession() {
  const presetDropdown = document.getElementById("presetSelect");
  const presetVal = presetDropdown ? presetDropdown.value : "built_in_trap";
  if (presetVal === "custom") {
    localStorage.removeItem("reelfocus_custom_history");
  }
  loadPreset(presetVal);
}

/**
 * Render all feed slides dynamically inside the scrollable container.
 */
function renderFeedSlides() {
  const container = document.getElementById("phoneScrollContainer");
  if (!container) return;

  container.innerHTML = "";

  INPUT_REELS.forEach((reel) => {
    const slide = document.createElement("div");
    slide.className = "video-slide";
    slide.id = `slide_${reel.id}`;
    slide.setAttribute("data-id", reel.id);

    const state = sessionHistory[reel.id] || { liked: false, saved: false, shared: false, comments: [] };
    const isLiked = state.liked || false;
    const isSaved = state.saved || false;
    const isShared = state.shared || false;

    const primaryCategory = Object.keys(reel.category_weights).sort((a,b) => reel.category_weights[b] - reel.category_weights[a])[0];
    let categoryEmoji = "💻";
    switch (primaryCategory) {
      case "Java": categoryEmoji = "☕"; break;
      case "Career": categoryEmoji = "👔"; break;
      case "DSA": categoryEmoji = "🌳"; break;
      case "Hardware": categoryEmoji = "💻"; break;
      case "AI": categoryEmoji = "🤖"; break;
      case "Cloud": categoryEmoji = "☁️"; break;
      case "Gaming": categoryEmoji = "🎮"; break;
      case "Entertainment": categoryEmoji = "🎬"; break;
    }

    slide.innerHTML = `
      <!-- Video player wrapper loaded on-demand -->
      <div class="video-iframe-wrapper" id="iframe_wrap_${reel.id}"></div>

      <!-- Transparent Scroll Shield (intercepts scroll/drag to prevent iframe lock) -->
      <div class="video-scroll-shield"></div>

      <!-- Play/Pause Indicator Overlay -->
      <div class="video-play-overlay" id="play_overlay_${reel.id}">▶</div>

      <!-- Fallback visualizer placeholder -->
      <div class="video-canvas-placeholder" id="placeholder_${reel.id}">
        <div class="video-animation-visual">
          <div style="font-size: 2.2rem;">${categoryEmoji}</div>
        </div>
        <div style="font-size: 0.75rem; text-align: center; color: var(--text-secondary); max-width: 80%; padding: 0 10px;">
          [Scene: ${reel.visuals}]
        </div>
      </div>

      <div class="video-tag-overlay">${reel.title}</div>

      <!-- Injected Recommendation Overlay Card -->
      ${reel.is_injected && reel.customExplanation ? `
        <div class="ai-recommendation-overlay-card">
          <div class="ai-badge">🤖 AI RECOMMENDED (${reel.customExplanation.engine})</div>
          <div class="ai-reason-title">Interest: <b>${reel.customExplanation.interestDetected}</b></div>
          <div class="ai-reason-body">${reel.customExplanation.whyRecommend}</div>
        </div>
      ` : ''}

      <!-- Right Interaction Sidebar -->
      <div class="phone-actions-sidebar">
        <button class="phone-action-btn mute-toggle-btn ${!window.isMuted ? 'unmuted-active' : ''}" onclick="toggleMuteState()">${window.isMuted ? '🔇' : '🔊'}</button>
        <span class="phone-action-label mute-label">Sound</span>

        <button class="phone-action-btn play-pause-toggle-btn" onclick="togglePlayPause()">⏸️</button>
        <span class="phone-action-label play-pause-label">Pause</span>

        <button class="phone-action-btn like-btn ${isLiked ? 'active-like' : ''}" onclick="toggleLike('${reel.id}')">❤️</button>
        <span class="phone-action-label like-label">${isLiked ? 'Liked' : 'Like'}</span>

        <button class="phone-action-btn comment-btn" onclick="toggleComments(true, '${reel.id}')">💬</button>
        <span class="phone-action-label comment-label">${state.comments.length}</span>

        <button class="phone-action-btn save-btn ${isSaved ? 'active-save' : ''}" onclick="toggleSave('${reel.id}')">🔖</button>
        <span class="phone-action-label save-label">${isSaved ? 'Saved' : 'Save'}</span>

        <button class="phone-action-btn share-btn ${isShared ? 'active-share' : ''}" onclick="triggerShare('${reel.id}')">🔗</button>
        <span class="phone-action-label share-label">${isShared ? 'Shared' : 'Share'}</span>
      </div>

      <!-- Video Description Info -->
      <div class="video-overlay-content">
        <div class="creator-handle">@${reel.creator}</div>
        <div class="video-caption">${reel.description}</div>
        <div class="video-tags-row">
          ${reel.tags.map(tag => `<span class="video-tag">#${tag}</span>`).join('')}
        </div>
      </div>
    `;

    // Append injected badge if recommended video autoplayed
    if (reel.is_injected) {
      const injectedBadge = document.createElement("div");
      injectedBadge.className = "injected-feed-badge";
      injectedBadge.textContent = "Recommended Autoplayed";
      slide.appendChild(injectedBadge);
    }

    container.appendChild(slide);
  });

  setupScrollObserver();
  setActiveReel(currentReelIndex);
}

/**
 * Configure IntersectionObserver to detect snap scrolls and load iframe players dynamically.
 */
function setupScrollObserver() {
  const container = document.getElementById("phoneScrollContainer");
  if (!container) return;

  if (scrollObserver) {
    scrollObserver.disconnect();
  }

  const options = {
    root: container,
    threshold: 0.6 // Active when 60% of the slide is in view
  };

  scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const reelId = entry.target.getAttribute("data-id");
        const index = INPUT_REELS.findIndex(r => r.id === reelId);
        if (index !== -1 && index !== currentReelIndex) {
          setActiveReel(index);
        }
      }
    });
  }, options);

  document.querySelectorAll(".video-slide").forEach(slide => {
    scrollObserver.observe(slide);
  });
}

/**
 * Empty trigger matching index.html event hook
 */
function handlePhoneScroll() {
  // Snapping calculations handled by IntersectionObserver
}

/**
 * Set active Reel index, load active Iframe player, and unload inactive players.
 */
function setActiveReel(index) {
  currentReelIndex = index;
  const activeReel = INPUT_REELS[currentReelIndex];
  if (!activeReel) return;

  const state = sessionHistory[activeReel.id];

  // Dynamic Iframe Management (using YT Iframe API for sound toggle)
  INPUT_REELS.forEach((reel) => {
    showPlayOverlay(reel.id, false);
    const wrapper = document.getElementById(`iframe_wrap_${reel.id}`);
    if (wrapper) {
      if (reel.id === activeReel.id) {
        const isDirectVideo = reel.youtube_id.startsWith("http") || reel.youtube_id.endsWith(".mp4");
        
        if (!wrapper.innerHTML) {
          if (isDirectVideo) {
            // Render native HTML5 video player
            wrapper.innerHTML = `<video id="native_video_${reel.id}" src="${reel.youtube_id}" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>`;
            const video = document.getElementById(`native_video_${reel.id}`);
            if (video) {
              video.muted = window.isMuted;
              const hidePlaceholder = () => {
                const placeholder = document.getElementById(`placeholder_${reel.id}`);
                if (placeholder) {
                  placeholder.style.opacity = "0";
                  placeholder.style.pointerEvents = "none";
                }
              };
              video.addEventListener("playing", hidePlaceholder);
              video.addEventListener("play", hidePlaceholder);
              video.addEventListener("timeupdate", hidePlaceholder);
              video.play().catch(e => console.warn("Native video autoplay block", e));
            }
          } else {
            // Add player node placeholder
            wrapper.innerHTML = `<div id="player_node_${reel.id}" style="width:100%;height:100%;"></div>`;
            
            // Initialize YT Player
            if (typeof YT !== "undefined" && YT.Player) {
              try {
                window.ytPlayers[reel.id] = new YT.Player(`player_node_${reel.id}`, {
                  height: '100%',
                  width: '100%',
                  videoId: reel.youtube_id,
                  playerVars: {
                    autoplay: 1,
                    mute: window.isMuted ? 1 : 0,
                    loop: 1,
                    playlist: reel.youtube_id,
                    controls: 0,
                    modestbranding: 1,
                    rel: 0,
                    showinfo: 0,
                    iv_load_policy: 3
                  },
                  events: {
                    onReady: (event) => {
                      try {
                        event.target.playVideo();
                        if (window.isMuted) event.target.mute(); else event.target.unMute();
                      } catch(e){}
                    },
                    onStateChange: (event) => {
                      try {
                        if (event.data === 1) { // YT.PlayerState.PLAYING
                          const placeholder = document.getElementById(`placeholder_${reel.id}`);
                          if (placeholder) {
                            placeholder.style.opacity = "0";
                            placeholder.style.pointerEvents = "none";
                          }
                        }
                      } catch(e){}
                    },
                    onError: (event) => {
                      const errorCode = event.data;
                      console.warn(`YouTube Player caught playback error ${errorCode} for video ID "${reel.youtube_id}". Auto-healing with verified embed...`);
                      try {
                        // Instantly load the verified working 3b1b neural net video ID
                        event.target.loadVideoById("aircAruvnKk");
                      } catch(e){}
                    }
                  }
                });
              } catch(e) {
                wrapper.innerHTML = `<iframe src="https://www.youtube.com/embed/${reel.youtube_id}?autoplay=1&mute=${window.isMuted ? 1 : 0}&loop=1&playlist=${reel.youtube_id}&controls=0" allow="autoplay; encrypted-media"></iframe>`;
              }
            } else {
              wrapper.innerHTML = `<iframe src="https://www.youtube.com/embed/${reel.youtube_id}?autoplay=1&mute=${window.isMuted ? 1 : 0}&loop=1&playlist=${reel.youtube_id}&controls=0" allow="autoplay; encrypted-media"></iframe>`;
            }
          }
        } else {
          if (isDirectVideo) {
            const video = document.getElementById(`native_video_${reel.id}`);
            if (video) {
              video.muted = window.isMuted;
              const hidePlaceholder = () => {
                const placeholder = document.getElementById(`placeholder_${reel.id}`);
                if (placeholder) {
                  placeholder.style.opacity = "0";
                  placeholder.style.pointerEvents = "none";
                }
              };
              video.addEventListener("playing", hidePlaceholder);
              video.addEventListener("play", hidePlaceholder);
              video.addEventListener("timeupdate", hidePlaceholder);
              video.play().catch(e => {});
            }
          } else {
            // Play video if paused
            const player = window.ytPlayers[reel.id];
            if (player && typeof player.playVideo === "function") {
              try {
                player.playVideo();
                if (window.isMuted) player.mute(); else player.unMute();
              } catch(e){}
            }
          }
        }
      } else {
        // Unload inactive player to save resources and silence audio
        wrapper.innerHTML = ""; 
        const placeholder = document.getElementById(`placeholder_${reel.id}`);
        if (placeholder) {
          placeholder.style.opacity = "1";
          placeholder.style.pointerEvents = "auto";
        }
        if (window.ytPlayers[reel.id]) {
          try {
            window.ytPlayers[reel.id].destroy();
          } catch(e){}
          delete window.ytPlayers[reel.id];
        }
      }
    }
  });

  // Sync Bottom Controls
  const timeSlider = document.getElementById("timeSlider");
  const watchPercentage = (state.watch_time / activeReel.duration) * 100;
  if (timeSlider) {
    timeSlider.value = watchPercentage;
  }
  updateTimeSliderText(state.watch_time, activeReel.duration);

  // Sync Loop buttons
  document.querySelectorAll(".loop-btn").forEach(btn => btn.classList.remove("active"));
  const activeLoopBtn = document.getElementById(`loop-${Math.min(state.loops, 3)}`);
  if (activeLoopBtn) activeLoopBtn.classList.add("active");

  // Sync pagination button states
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  if (prevBtn) prevBtn.disabled = currentReelIndex === 0;

  // Auto-inject recommended video if we are on the last slide of the feed
  if (currentReelIndex === INPUT_REELS.length - 1) {
    checkAndInjectRecommendation();
  }

  const hasRecommendations = window.activeRecommendations && window.activeRecommendations.length > 0;
  if (nextBtn) {
    if (currentReelIndex === INPUT_REELS.length - 1 && !hasRecommendations) {
      nextBtn.disabled = true;
    } else {
      nextBtn.disabled = false;
    }
  }

  // Recalculate DNA as index changes to capture active scroll weight
  recalculateDNA();
}

/**
 * Handles sliding the progress bar.
 */
function updateTimeSlider(val) {
  const reel = INPUT_REELS[currentReelIndex];
  const state = sessionHistory[reel.id];
  const calculatedSeconds = Math.round((val / 100) * reel.duration);
  state.watch_time = calculatedSeconds;
  
  updateTimeSliderText(calculatedSeconds, reel.duration);
  recalculateDNA();
}

function updateTimeSliderText(watched, duration) {
  const label = document.getElementById("timeLabel");
  if (label) {
    label.textContent = `0:${watched.toString().padStart(2, '0')} / 0:${duration}`;
  }
}

/**
 * Automatically checks and injects the top recommendation into the active simulator feed list.
 * Returns true if a new reel was successfully appended.
 */
function checkAndInjectRecommendation() {
  const topRec = window.activeRecommendations && window.activeRecommendations[0];
  if (!topRec) return false;

  // Check if this video has already been added to the feed
  const alreadyAdded = INPUT_REELS.some(r => r.id === topRec.id || r.title === topRec.title);
  if (alreadyAdded) return false;

  // Construct simulator Reel from Candidate Recommendation
  const injectedReel = {
    id: topRec.id || `injected_${Date.now()}`,
    title: topRec.title,
    creator: topRec.creator || "youtube_educator",
    duration: 45, // default duration
    youtube_id: topRec.youtube_id || "psQzyFpUGb0",
    description: `Educational recommendation based on your interests: ${topRec.transcript || topRec.learning_outcome}`,
    transcript: topRec.transcript || "",
    visuals: `Animated schematic describing ${topRec.title}.`,
    category_weights: {},
    tags: [topRec.category.toLowerCase(), "education", "learning"],
    is_injected: true // Displays the green indicator badge
  };

  // Seed category weights (strong focus on recommended category)
  injectedReel.category_weights[topRec.category] = 0.9;
  injectedReel.category_weights["Career"] = 0.2; // slight career booster

  // Build dynamic explanation card details citing recommendation engine source
  injectedReel.customExplanation = {
    interestDetected: topRec.category + " Focus",
    whyRecommend: topRec.transcript ? topRec.transcript.substring(0, 150) + "..." : topRec.learning_outcome,
    engine: window.recommendationSource || (topRec.is_external ? "Gemini LLM" : "Local Model")
  };

  // Push to feed and initialize state
  INPUT_REELS.push(injectedReel);
  sessionHistory[injectedReel.id] = {
    reel_id: injectedReel.id,
    watch_time: 0,
    liked: false,
    saved: false,
    shared: false,
    loops: 1,
    comments: []
  };

  // Re-render feed slides to include the injected reel in scrollable list
  renderFeedSlides();
  showInjectionNotification(topRec.title);
  return true;
}

/**
 * Navigate through the reels timeline and handle dynamic recommendation injection.
 */
function navigateFeed(direction) {
  const newIndex = currentReelIndex + direction;

  // If we reach the end of the current feed, try to inject the highest recommended video
  if (newIndex === INPUT_REELS.length && direction === 1) {
    if (checkAndInjectRecommendation()) {
      // Scroll to the new slide
      setTimeout(() => {
        const slide = document.getElementById(`slide_${INPUT_REELS[INPUT_REELS.length - 1].id}`);
        if (slide) {
          slide.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      recalculateDNA();
      return;
    }
  }

  if (newIndex >= 0 && newIndex < INPUT_REELS.length) {
    const slide = document.getElementById(`slide_${INPUT_REELS[newIndex].id}`);
    if (slide) {
      slide.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

function showInjectionNotification(title) {
  // Create a floating overlay message indicating injection
  const notification = document.createElement("div");
  notification.style.position = "absolute";
  notification.style.bottom = "140px";
  notification.style.left = "50%";
  notification.style.transform = "translateX(-50%)";
  notification.style.backgroundColor = "var(--bg-card)";
  notification.style.border = "1px solid var(--accent-emerald)";
  notification.style.padding = "8px 16px";
  notification.style.borderRadius = "20px";
  notification.style.fontSize = "0.75rem";
  notification.style.color = "var(--text-primary)";
  notification.style.zIndex = "1000";
  notification.style.textAlign = "center";
  notification.style.boxShadow = "0 10px 25px rgba(0,0,0,0.5)";
  notification.style.width = "85%";
  notification.style.animation = "slideUp 0.3s cubic-bezier(0.1, 0.8, 0.2, 1)";
  notification.innerHTML = `🎓 <b>Auto-Play Injection:</b><br><span style="color:var(--accent-emerald)">"${title}"</span> added to your feed next!`;

  const container = document.getElementById(`slide_${INPUT_REELS[currentReelIndex].id}`);
  if (container) {
    container.appendChild(notification);
  }
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transition = "opacity 0.5s";
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

/**
 * Toggle Liking the active Reel.
 */
function toggleLike(reelId) {
  const id = reelId || INPUT_REELS[currentReelIndex].id;
  const state = sessionHistory[id];
  state.liked = !state.liked;
  
  const slide = document.getElementById(`slide_${id}`);
  if (slide) {
    const btn = slide.querySelector(".like-btn");
    const label = slide.querySelector(".like-label");
    if (state.liked) {
      btn.classList.add("active-like");
      label.textContent = "Liked";
    } else {
      btn.classList.remove("active-like");
      label.textContent = "Like";
    }
  }
  recalculateDNA();
}

/**
 * Toggle Saving the active Reel.
 */
function toggleSave(reelId) {
  const id = reelId || INPUT_REELS[currentReelIndex].id;
  const state = sessionHistory[id];
  state.saved = !state.saved;
  
  const slide = document.getElementById(`slide_${id}`);
  if (slide) {
    const btn = slide.querySelector(".save-btn");
    const label = slide.querySelector(".save-label");
    if (state.saved) {
      btn.classList.add("active-save");
      label.textContent = "Saved";
    } else {
      btn.classList.remove("active-save");
      label.textContent = "Save";
    }
  }
  recalculateDNA();
}

/**
 * Simulates sharing a Reel.
 */
function triggerShare(reelId) {
  const id = reelId || INPUT_REELS[currentReelIndex].id;
  const state = sessionHistory[id];
  state.shared = !state.shared;
  
  const slide = document.getElementById(`slide_${id}`);
  if (slide) {
    const btn = slide.querySelector(".share-btn");
    const label = slide.querySelector(".share-label");
    if (state.shared) {
      btn.classList.add("active-share");
      label.textContent = "Shared";
    } else {
      btn.classList.remove("active-share");
      label.textContent = "Share";
    }
  }
  recalculateDNA();
}

/**
 * Toggle loops settings.
 */
function setLoops(val) {
  const reel = INPUT_REELS[currentReelIndex];
  const state = sessionHistory[reel.id];
  state.loops = val;
  
  // Update Loop button state
  document.querySelectorAll(".loop-btn").forEach(btn => btn.classList.remove("active"));
  const activeLoopBtn = document.getElementById(`loop-${Math.min(state.loops, 3)}`);
  if (activeLoopBtn) activeLoopBtn.classList.add("active");

  recalculateDNA();
}

/**
 * Comment Section Overlay Drawer
 */
function toggleComments(open, reelId) {
  const drawer = document.getElementById("commentsDrawer");
  if (!drawer) return;

  if (open) {
    activeCommentReelId = reelId || INPUT_REELS[currentReelIndex].id;
    drawer.classList.add("open");
    const state = sessionHistory[activeCommentReelId];
    renderCommentsList(state.comments);
  } else {
    drawer.classList.remove("open");
    activeCommentReelId = null;
  }
}

function renderCommentsList(comments) {
  const list = document.getElementById("commentsList");
  list.innerHTML = "";
  
  if (comments.length === 0) {
    list.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.75rem; margin-top: 20px;">No comments yet. Be the first to comment!</div>`;
    return;
  }

  comments.forEach(txt => {
    const div = document.createElement("div");
    div.className = "comment-bubble";
    div.innerHTML = `<div class="comment-author">You</div><div>${txt}</div>`;
    list.appendChild(div);
  });
  
  // Scroll to bottom
  list.scrollTop = list.scrollHeight;
}

function submitComment() {
  const input = document.getElementById("commentInput");
  const txt = input.value.trim();
  if (!txt || !activeCommentReelId) return;

  const state = sessionHistory[activeCommentReelId];
  state.comments.push(txt);
  
  input.value = "";
  
  // Sync button count label
  const slide = document.getElementById(`slide_${activeCommentReelId}`);
  if (slide) {
    const counter = slide.querySelector(".comment-label");
    if (counter) counter.textContent = state.comments.length;
  }

  renderCommentsList(state.comments);
  recalculateDNA();
}

function handleCommentSubmit(event) {
  if (event.key === "Enter") {
    submitComment();
  }
}

/**
 * CORE ALGORITHMIC ENGINE:
 * Calculates user engagement weights and updates the inferred profile vector (Interest DNA).
 */
function calculateEngagementWeight(state, reel) {
  const ratio = state.watch_time / reel.duration;
  
  // Early Skip Penalty
  if (ratio < 0.15) {
    return -0.4; // Returns negative weight for immediate skip (less than 3 seconds)
  }

  let coefficient = 1.0;
  if (state.liked) coefficient += 0.2;
  if (state.saved) coefficient += 0.4;
  if (state.shared) coefficient += 0.5;
  if (state.comments && state.comments.length > 0) {
    coefficient += 0.3;
    
    // Look for technical context inside comments
    state.comments.forEach(comment => {
      const lower = comment.toLowerCase();
      if (lower.includes("learn") || lower.includes("how to") || lower.includes("study") || lower.includes("tutorial")) {
        coefficient += 0.2; // Extra educational intent booster
      }
    });
  }

  let loopMultiplier = 1.0;
  if (state.loops > 1) {
    loopMultiplier += 0.5 * (state.loops - 1);
  }

  return ratio * coefficient * loopMultiplier;
}

function recalculateDNA() {
  // Reset inferred DNA totals
  const dnaScores = {};
  CORE_CATEGORIES.forEach(c => dnaScores[c] = 0);

  // Helper trackers for Productivity stats
  let totalTimeOnNonProductive = 0; // Entertainment & Gaming
  let totalTimeOnProductive = 0; // Hardware, Cloud, AI, DSA, Java
  let hypeSkipped = 0;

  // Process all interactions in log
  const logRows = [];

  INPUT_REELS.forEach(reel => {
    const state = sessionHistory[reel.id];
    const weight = calculateEngagementWeight(state, reel);
    const watchRatio = state.watch_time / reel.duration;

    // Track time spent in minutes
    const actualSecondsWatched = state.watch_time * state.loops;
    const isProductive = reel.category_weights["Entertainment"] === undefined && reel.category_weights["Gaming"] === undefined;
    
    if (isProductive) {
      totalTimeOnProductive += actualSecondsWatched;
    } else {
      totalTimeOnNonProductive += actualSecondsWatched;
    }

    // Capture anti-hype block behavior
    if (reel.id === "reel_ai_hype" && watchRatio < 0.25) {
      hypeSkipped = 1;
    }

    // Multiply engagement weight across categories
    Object.keys(reel.category_weights).forEach(category => {
      if (dnaScores[category] !== undefined) {
        dnaScores[category] += weight * reel.category_weights[category];
      }
    });

    // Capture entry for logging
    if (state.watch_time > 0 || state.liked || state.saved || state.shared || state.comments.length > 0) {
      let signalText = [];
      if (state.liked) signalText.push("Like");
      if (state.saved) signalText.push("Save");
      if (state.shared) signalText.push("Share");
      if (state.comments.length > 0) signalText.push(`Comm (${state.comments.length})`);
      
      logRows.push({
        title: reel.title,
        ratio: `${Math.round(watchRatio * 100)}%`,
        signals: signalText.join(", ") || "None",
        loops: `${state.loops}x`,
        score: weight.toFixed(2)
      });
    }
  });

  // Render Log Table Rows
  const tbody = document.getElementById("logTableBody");
  tbody.innerHTML = "";
  if (logRows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No interaction history registered yet. Start sliding the progress bar or double-tapping to like!</td></tr>`;
  } else {
    logRows.forEach(row => {
      const tr = document.createElement("tr");
      const isPos = parseFloat(row.score) > 0;
      tr.innerHTML = `
        <td>${row.title}</td>
        <td>${row.ratio}</td>
        <td>${row.signals}</td>
        <td>${row.loops}</td>
        <td><span class="log-score-badge ${isPos ? 'positive' : 'negative'}">${row.score}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Calculate final DNA vector using Softmax-like normalized scaling to percentage
  // Ensure we don't display negative values. Clamp baseline at 0.
  const correctedDNA = {};
  let sum = 0;
  CORE_CATEGORIES.forEach(c => {
    correctedDNA[c] = Math.max(0, dnaScores[c]);
    sum += correctedDNA[c];
  });

  const finalDNA = {};
  CORE_CATEGORIES.forEach(c => {
    finalDNA[c] = sum > 0 ? Math.round((correctedDNA[c] / sum) * 100) : 0;
  });

  // Store for retrieval algorithms
  window.inferredDNA = finalDNA;

  // Render DNA Bars
  const barsContainer = document.getElementById("dnaBars");
  barsContainer.innerHTML = "";

  // Sort categories by score to show the highest affinities first
  const sortedCategories = [...CORE_CATEGORIES].sort((a,b) => finalDNA[b] - finalDNA[a]);

  sortedCategories.forEach(category => {
    const pct = finalDNA[category];
    const row = document.createElement("div");
    row.className = "dna-bar-row";
    
    // Choose colors based on category classifications
    let barColor = "var(--accent-blue)";
    if (category === "Entertainment" || category === "Gaming" || category === "Hype") {
      barColor = "var(--text-muted)";
    } else if (category === "Java" || category === "Career") {
      barColor = "var(--accent-amber)";
    } else if (category === "HLD" || category === "DSA" || category === "AI") {
      barColor = "var(--accent-cyan)";
    }

    row.innerHTML = `
      <span class="dna-bar-label">${category}</span>
      <div class="dna-bar-track">
        <div class="dna-bar-fill" style="width: ${pct}%; background-color: ${barColor}"></div>
      </div>
      <span class="dna-bar-percent">${pct}%</span>
    `;
    barsContainer.appendChild(row);
  });

  // Update Productivity Metrics on Dashboard
  // Time Saved calculation represents: (Entertainment scrolling time replaced by educational relevance)
  const savedMinutes = Math.round((totalTimeOnProductive) / 60);
  document.getElementById("metricSavedTime").textContent = `${savedMinutes}m`;
  
  // Hype Counter
  document.getElementById("metricHypeBlocked").textContent = hypeSkipped;
  if (hypeSkipped > 0) {
    document.getElementById("metricHypeBlocked").className = "metric-val emerald";
  } else {
    document.getElementById("metricHypeBlocked").className = "metric-val";
  }

  // Badges level mapping based on dominant productive category
  const dominantCategory = sortedCategories.find(c => c !== "Entertainment" && c !== "Gaming");
  const dominantPct = finalDNA[dominantCategory] || 0;
  
  let rank = "Lvl 1 - Novice";
  if (dominantPct > 15) {
    if (dominantCategory === "DSA") rank = "Lvl 2 - Algo Explorer";
    else if (dominantCategory === "HLD") rank = "Lvl 2 - System Planner";
    else if (dominantCategory === "AI") rank = "Lvl 2 - Neuron Scout";
    else if (dominantCategory === "Java") rank = "Lvl 2 - JVM Apprent";
    else if (dominantCategory === "Cloud") rank = "Lvl 2 - Cloud cadet";
    else rank = "Lvl 2 - Apprentice";
  }
  if (dominantPct > 35) {
    if (dominantCategory === "DSA") rank = "Lvl 3 - Big-O Master";
    else if (dominantCategory === "HLD") rank = "Lvl 3 - Architect";
    else if (dominantCategory === "AI") rank = "Lvl 3 - Agent Builder";
    else rank = "Lvl 3 - Senior Dev";
  }
  document.getElementById("metricBadges").textContent = rank;
  
  // Save custom history to localStorage to accumulate past watch history
  saveCustomSession();
  
  // Debounce the recommendation pipeline trigger to update in real-time
  triggerDebouncedRecommendations();
}

function saveCustomSession() {
  const presetSelect = document.getElementById("presetSelect");
  const activePreset = presetSelect ? presetSelect.value : "built_in_trap";
  localStorage.setItem(`reelfocus_state_${activePreset}`, JSON.stringify(sessionHistory));
  localStorage.setItem("reelfocus_active_preset", activePreset);
  localStorage.setItem("reelfocus_current_index", currentReelIndex);
}

function triggerDebouncedRecommendations() {
  const statusBadge = document.getElementById("recommendationStatusBadge");
  if (statusBadge) {
    statusBadge.textContent = "SYNCING...";
    statusBadge.style.color = "var(--accent-amber)";
    statusBadge.style.borderColor = "rgba(245, 158, 11, 0.2)";
  }
  
  clearTimeout(recommendTimeout);
  recommendTimeout = setTimeout(() => {
    generateRecommendations();
  }, 800); // 800ms snappier debounce rate to avoid API limits and capture final active slide focus
}

// Simulated asynchronous database query (prevents CORS blocks on local file runs)
async function fetchCandidatesFromDatabase() {
  await new Promise(resolve => setTimeout(resolve, 300));
  return RECOMMENDED_LIBRARY;
}

/**
 * Helper to calculate the highest local candidate score.
 * Returns the maximum cosine similarity score from pre-seeded recommendations.
 */
function getBestLocalMatchScore() {
  const userDNA = window.inferredDNA || {};
  let maxScore = 0;
  
  RECOMMENDED_LIBRARY.forEach(candidate => {
    // Exclude dynamically cached external videos to evaluate local base database
    if (candidate.is_external) return;

    let score = 0;
    Object.keys(candidate.relevance_vector).forEach(cat => {
      const userPreference = userDNA[cat] || 0;
      score += userPreference * candidate.relevance_vector[cat];
    });

    if (userDNA["Career"] > 10 && candidate.relevance_vector["Career"]) {
      score += userDNA["Career"] * candidate.relevance_vector["Career"] * 0.5;
    }

    if (score > maxScore) maxScore = score;
  });
  
  return maxScore;
}

/**
 * GENERATION PIPELINE:
 * Dispatches recommendations via local math OR live LLM.
 * Automatically triggers the LLM (Gemini) when a "No Match" occurs locally.
 */
async function generateRecommendations() {
  const statusBadge = document.getElementById("recommendationStatusBadge");
  const list = document.getElementById("recommendationsList");
  
  if (statusBadge) {
    statusBadge.textContent = "THINKING...";
    statusBadge.style.color = "var(--accent-amber)";
    statusBadge.style.borderColor = "rgba(245, 158, 11, 0.2)";
  }

  try {
    // Check if we have a local database match (Threshold: 8.0)
    const bestLocalScore = getBestLocalMatchScore();
    const noLocalMatchOccurred = bestLocalScore < 8.0;

    if (noLocalMatchOccurred && apiKey) {
      console.log(`Hybrid Trigger: No local matches found (Max score ${bestLocalScore.toFixed(1)} < 8.0). Calling Live Gemini Agent to crawl external YouTube content.`);
      
      list.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <div class="video-animation-visual" style="margin: 0 auto 16px;"></div>
          🔍 <b>No local database matches found!</b><br>
          Triggering live Gemini Agent to crawl YouTube and expand candidates library...
        </div>
      `;

      await runGeminiRecommendation();

      if (statusBadge) {
        statusBadge.textContent = "AI EXPANDED (DYNAMIC)";
        statusBadge.style.color = "var(--accent-emerald)";
        statusBadge.style.borderColor = "rgba(16, 185, 129, 0.2)";
      }
    } else {
      // Normal flow: if apiKey is set, use live model, else use local calculator
      if (apiKey) {
        await runGeminiRecommendation();
      } else {
        await runLocalRecommendation();
      }
      
      if (statusBadge) {
        statusBadge.textContent = apiKey ? "LIVE AI SYNCED" : "LOCAL SYNCED";
        statusBadge.style.color = apiKey ? "var(--accent-emerald)" : "var(--accent-cyan)";
        statusBadge.style.borderColor = apiKey ? "rgba(16, 185, 129, 0.2)" : "rgba(6, 182, 212, 0.2)";
      }
    }
  } catch (err) {
    console.error("Agent Engine Error:", err);
    
    // Display warning banner inside listings
    const errBanner = document.createElement("div");
    errBanner.style.padding = "12px";
    errBanner.style.backgroundColor = "rgba(244, 63, 94, 0.08)";
    errBanner.style.border = "1px solid rgba(244, 63, 94, 0.2)";
    errBanner.style.borderRadius = "8px";
    errBanner.style.color = "var(--accent-rose)";
    errBanner.style.fontSize = "0.75rem";
    errBanner.style.marginBottom = "16px";
    errBanner.innerHTML = "⚠️ <b>Live AI Agent Error:</b> API limits exceeded or invalid key. Reverting to Local VSM Cosine Engine.";

    await runLocalRecommendation();
    list.insertBefore(errBanner, list.firstChild);
    
    if (statusBadge) {
      statusBadge.textContent = "LOCAL SYNCED (FALLBACK)";
      statusBadge.style.color = "var(--accent-rose)";
      statusBadge.style.borderColor = "rgba(244, 63, 94, 0.2)";
    }
  }

  // Sync Next button active state
  const hasRecommendations = window.activeRecommendations && window.activeRecommendations.length > 0;
  const nextBtn = document.getElementById("nextBtn");
  if (nextBtn) {
    if (currentReelIndex === INPUT_REELS.length - 1 && !hasRecommendations) {
      nextBtn.disabled = true;
    } else {
      nextBtn.disabled = false;
    }
  }
}

/**
 * OFFLINE ENGINE: Cosine Similarity Matching & Pre-compiled Templates
 */
async function runLocalRecommendation() {
  window.recommendationSource = "Local Model";
  const userDNA = window.inferredDNA || {};
  
  // Asynchronously query our database
  const candidates = await fetchCandidatesFromDatabase();
  
  // Filter out candidates already present in the active feed (don't recommend seed videos again)
  const availableCandidates = candidates.filter(c => !INPUT_REELS.some(r => r.youtube_id === c.youtube_id || r.title === c.title));
  
  // Calculate similarity score for each candidate reel
  const scoredCandidates = availableCandidates.map(candidate => {
    let score = 0;
    
    // Dot product between user interests and candidate relevance
    Object.keys(candidate.relevance_vector).forEach(cat => {
      const userPreference = userDNA[cat] || 0;
      score += userPreference * candidate.relevance_vector[cat];
    });

    // Career matching multiplier: if user has high career interest, boost templates containing career elements
    if (userDNA["Career"] > 10 && candidate.relevance_vector["Career"]) {
      score += userDNA["Career"] * candidate.relevance_vector["Career"] * 0.5;
    }

    return {
      candidate: candidate,
      score: score
    };
  });

  // Sort candidates by score descending
  scoredCandidates.sort((a, b) => b.score - a.score);

  // Take top 3 recommendations
  const topRecommendations = scoredCandidates.slice(0, 3).map(item => item.candidate);

  // Store in global memory so pagination injection knows what the top item is
  window.activeRecommendations = topRecommendations;

  // Render the recommendations
  renderRecommendations(topRecommendations);
}

/**
 * LOCAL RECONSTRUCTION OF TEXT REASONS:
 * Compiles high-fidelity explainability parameters matching the required output format
 */
function getExplainabilityFields(candidate) {
  const userDNA = window.inferredDNA || {};
  
  // Sort input history by engagement score to identify key trigger reels
  const activeTriggerReels = INPUT_REELS.map(reel => {
    const state = sessionHistory[reel.id];
    return {
      title: reel.title,
      score: calculateEngagementWeight(state, reel)
    };
  }).filter(item => item.score > 0)
    .sort((a,b) => b.score - a.score);

  // Primary trigger reel title
  const currentReel = activeTriggerReels.length > 0 ? activeTriggerReels[0].title : "General Scrolling Habits";
  
  let interestDetected = "";
  let whyEvidence = "";
  let whyRecommend = "";

  // Draft explainability maps based on candidate category
  switch (candidate.category) {
    case "HLD":
      interestDetected = "Software Engineering Career & System Design";
      whyEvidence = "You spent significant time watching Software Engineer lifestyle vlogs and dynamic programming interview jokes. While a shallow algorithm sees individual jokes, we detected your interest in passing high-level architectural assessments and building scalable systems.";
      whyRecommend = `This video explaining Netflix's globally distributed stream infrastructure establishes critical foundational concepts for high-level system design. It connects your interest in tech company culture to the deep architectural problems senior engineers solve daily.`;
      break;

    case "DSA":
      interestDetected = "Algorithmic Logic & Tech Interview Prep";
      whyEvidence = "You highly engaged with Leetcode and coding interview jokes, loop-watching and bookmarking them. This indicates an immediate, active interest in preparing for tech job recruitment pathways and coding logic.";
      whyRecommend = `Instead of showing shallow memes, this breakdown of time complexity and caching techniques equips you with the exact structural logic required to solve the algorithms you mocked in coding interview videos.`;
      break;

    case "Java":
      interestDetected = "Backend Software Architecture (Java/JVM)";
      whyEvidence = "You watched and commented on a Java compile error meme, re-watching it multiple times. We inferred that you are actively coding in object-oriented structures and need deeper runtime memory optimization knowledge rather than beginner loop tutorials.";
      whyRecommend = `Translating meme-frustrations into system logic, this tutorial explains how the Java Virtual Machine manages heap heaps and stacks. Understanding garbage collection helps you write optimized, memory-efficient enterprise backends.`;
      break;

    case "AI":
      interestDetected = "Artificial Intelligence Systems & LLM Architectures";
      whyEvidence = "You highly engaged with OpenAI updates, watching the full length and sharing it. You skipped hype clickbait lists early, indicating an interest in deep machine learning mechanics rather than marketing buzzwords.";
      whyRecommend = `This deep-dive explains vector embeddings and mathematical neural functions. It shifts AI exploration from basic chatbot interaction into the core algorithms behind modern semantic text parsing.`;
      break;

    case "Cloud":
      interestDetected = "Cloud Scale Infrastructure & Reliability";
      whyEvidence = "You watched the full Netflix AWS migration explanation. This highlights an underlying interest in DevOps, scaling applications globally, and designing resilient, containerized backend clusters.";
      whyRecommend = `This practical visual breakdown of container virtualization details how modern cloud infrastructures isolate code layers, helping you design high-availability backend microservices.`;
      break;

    case "Cybersecurity":
      interestDetected = "Application Security & Safe Programming Practices";
      whyEvidence = "You showed high focus on data parsing, coding compilers, and backend architecture, indicating a need for defensive coding patterns.";
      whyRecommend = `Teaches code-level database protection strategies. Explaining query sanitization ensures that you write secure, robust backend APIs that defend against common injection vulnerabilities.`;
      break;

    case "Hardware":
      interestDetected = "Hardware Benchmarks & Systems Engineering";
      whyEvidence = "You watched the detailed laptop chip comparison and saved it. This displays interest in computer specifications, compiler efficiencies, and low-level processing capabilities.";
      whyRecommend = `Directly links hardware speeds to coding practices. Explaining CPU cache lines teaches you how to structure data memory sequentially to write hardware-optimized, high-frequency algorithms.`;
      break;

    default:
      interestDetected = "Technology Foundations & Engineering Growth";
      whyEvidence = "Your interaction pattern shows a broad curiosity across computer engineering lifestyle, hardware vlogs, and coding memes.";
      whyRecommend = `Establishes core architectural best practices like SOLID and DRY. Applying these principles ensures you write robust, readable, and clean production code.`;
  }

  return {
    currentReel: currentReel,
    interestDetected: interestDetected,
    whyEvidence: whyEvidence,
    whyRecommend: whyRecommend
  };
}

/**
 * Render standard structured cards onto the UI matching the requested schema.
 */
function renderRecommendations(reels) {
  const container = document.getElementById("recommendationsList");
  container.innerHTML = "";

  reels.forEach(reel => {
    // Generate explanation details
    const explanation = getExplainabilityFields(reel);

    const card = document.createElement("div");
    card.className = `schema-card category-${reel.category.toLowerCase()}`;
    
    // Choose badge coloring
    const diffClass = `difficulty-${reel.difficulty.toLowerCase()}`;
    const confClass = `confidence-${reel.confidence_score.toLowerCase()}`;

    card.innerHTML = `
      <div class="schema-card-header">
        <span class="schema-category-tag">${reel.category}</span>
        <div class="schema-metadata">
          <span class="meta-badge ${diffClass}">DIFFICULTY: ${reel.difficulty}</span>
          <span class="meta-badge ${confClass}">CONFIDENCE: ${reel.confidence_score}</span>
        </div>
      </div>
      
      <!-- YouTube-style sidebar thumbnail and details layout -->
      <div class="schema-card-body-row" style="display: flex; gap: 12px; margin-top: 8px; margin-bottom: 8px; align-items: flex-start;">
        <img src="${reel.thumbnail || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=120&auto=format&fit=crop'}" class="schema-card-thumbnail" style="width: 120px; height: 75px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color); flex-shrink: 0;" />
        <div style="flex-grow: 1;">
          <div class="schema-title" style="margin: 0; font-size: 0.82rem; font-weight: 700; line-height: 1.25; color: var(--text-primary);">${reel.title}</div>
          <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 3px;">by @${reel.creator}</div>
        </div>
      </div>

      <!-- Structured Schema Output -->
      <div class="schema-body">
        <div class="schema-field">
          <span class="schema-field-label">CURRENT REEL</span>
          <span class="schema-field-value">${explanation.currentReel}</span>
        </div>
        <div class="schema-field">
          <span class="schema-field-label">INTEREST DETECTED</span>
          <span class="schema-field-value highlight-value">${explanation.interestDetected}</span>
        </div>
        <div class="schema-field">
          <span class="schema-field-label">WHY</span>
          <span class="schema-field-value">${explanation.whyEvidence}</span>
        </div>
        <div class="schema-field">
          <span class="schema-field-label">RECOMMENDED TECH REEL</span>
          <span class="schema-field-value highlight-value">${reel.title}</span>
        </div>
        <div class="schema-field">
          <span class="schema-field-label">CATEGORY</span>
          <span class="schema-field-value">${reel.category}</span>
        </div>
        <div class="schema-field">
          <span class="schema-field-label">WHY THIS RECOMMENDATION</span>
          <span class="schema-field-value">${explanation.whyRecommend}</span>
        </div>
        <div class="schema-field">
          <span class="schema-field-label">DIFFICULTY</span>
          <span class="schema-field-value">${reel.difficulty}</span>
        </div>
        <div class="schema-field">
          <span class="schema-field-label">CONFIDENCE</span>
          <span class="schema-field-value">${reel.confidence_score}</span>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

// Helper function to call the Gemini API with a specific model
async function callGeminiWithModel(modelName, systemContext, apiKey) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: systemContext }]
      }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API Model ${modelName} returned status ${response.status}`);
  }

  const jsonResult = await response.json();
  return jsonResult.candidates[0].content.parts[0].text;
}

/**
 * LIVE ENGINE: Calls Google Gemini API (1.5 Flash) via REST.
 * Sends user session interactions and candidates to generate real-time AI reasoning.
 * Simulates external YouTube lookup and dynamic candidate database insertion.
 */
async function runGeminiRecommendation() {
  window.recommendationSource = "Gemini LLM";
  const userDNA = window.inferredDNA || {};
  
  // Gather active session interactions for prompt injection
  const activeSessionLogs = INPUT_REELS.map(reel => {
    const state = sessionHistory[reel.id];
    const weight = calculateEngagementWeight(state, reel);
    if (state.watch_time > 0 || state.liked || state.saved || state.shared || state.comments.length > 0) {
      return {
        reel_title: reel.title,
        categories: Object.keys(reel.category_weights),
        watch_ratio: (state.watch_time / reel.duration).toFixed(2),
        liked: state.liked,
        saved: state.saved,
        shared: state.shared,
        loops: state.loops,
        comments: state.comments,
        computed_engagement_score: weight.toFixed(2)
      };
    }
    return null;
  }).filter(item => item !== null);

  // Filter out candidates already in active feed before sending to Gemini prompt
  const availableCandidatesForPrompt = RECOMMENDED_LIBRARY.filter(c => !INPUT_REELS.some(r => r.youtube_id === c.youtube_id || r.title === c.title));

  // Construct prompt supporting both candidate matching and external YouTube crawling
  const systemContext = `
You are an advanced AI Recommendation Agent for a student short-form feed application called ReelFocus. 
Your goal is to shift students' scrolling habits from low-value memes and entertainment to high-quality, educational technology videos matching their underlying interests.

Guidelines:
1. Deep Context Inference: Analyze the student's watch history. Look for deeper connections. Avoid the "Built-in Trap" of shallow tag matching (e.g. if they watch a single Java compile meme, do not just recommend basic Java loop tutorials). Analyze their entire session: if they also watched a Software Engineer vlog and an interview joke, they are interested in Software Engineering as a career. Recommending System Design (HLD) or Data Structures (DSA) is a much stronger match.
2. Anti-Hype Guardrail: Filter out hype, low-value clickbait videos (e.g. "10 AI tools that will get you a job in 2 weeks" or "Earn money sleeping with ChatGPT"). Avoid recommending these.
3. Dual-Channel Retrieval (Local vs External YouTube Search):
   - You can match candidates from the provided Candidate Library list.
   - If the student's history contains a completely new topic (e.g., Quantum Computing, Web3, Rust, Go, or low-level kernel hacking) that is NOT well represented in the Candidate Library, or if there is a well-known, high-value YouTube video/Shorts tutorial that fits their profile better, you MUST recommend that external video.
   - For external videos, set "is_external": true, suggest a realistic "creator" handle (e.g. "Fireship", "ByteByteGo", "CS50", "freeCodeCamp", "Veritasium", "Kurzgesagt"), write a realistic transcript summary, and suggest a valid youtube search query URL in "youtube_url".
4. Embedding & Copyright Safety Guardrail:
   - You MUST ONLY select or search for videos from highly reliable educational channels that allow open embedding on localhost and do not use copyrighted background music.
   - Specifically, for any external recommendations ("is_external": true) or dynamic video injection suggestions, you MUST strictly target and reuse public video IDs from these verified channels:
     * "3Blue1Brown" (using video IDs "aircAruvnKk", "IHZwWFHWa-w", "Ilg3gGewQ5U", "tIeHLnjs5U8")
     * "CS50" (using video ID "y62a5cQ7jL0")
     * "NeetCode" (using video IDs "rL5obz425LI", "F3Ua5N9W9rY")
   - Do NOT suggest videos from random vloggers, news networks, or channels that use commercial background music, as their embeds will fail and show "This video is unavailable" due to copyright blocks.

Session Watch Logs:
${JSON.stringify(activeSessionLogs, null, 2)}

Computed Interest DNA Affinities (Percentages):
${JSON.stringify(userDNA, null, 2)}

Available Candidate Tech Reels Library (Seed Videos Excluded):
${JSON.stringify(availableCandidatesForPrompt.map(r => ({ id: r.id, title: r.title, creator: r.creator, category: r.category, difficulty: r.difficulty, confidence_score: r.confidence_score, transcript: r.transcript })), null, 2)}

You MUST output your response strictly as a JSON array of objects. Do not wrap it in markdown ticks or write explanations outside the JSON. 
Each recommendation object in the array must strictly have these fields:
- "current_reel": The title/reference of the reel(s) in the watch logs that triggered this recommendation.
- "interest_detected": The underlying core interest/topic detected.
- "why": A clear, evidence-based explanation citing their session logs to explain why this interest was detected.
- "recommended_tech_reel": The exact title of the chosen candidate or external video.
- "category": Must be one of: AI, DSA, Java, HLD, Cybersecurity, Cloud, Hardware, Career, or Other.
- "why_this_recommendation": How this specific candidate matches their interest and helps their learning journey.
- "difficulty": Beginner, Intermediate, or Advanced.
- "confidence": High, Medium, or Low.
- "is_external": boolean (true if you are proposing an external YouTube/Shorts video outside the Candidate Library, false if it's from the provided Candidate Library).
- "creator": string (the channel name/creator, e.g., "Fireship" if external, or match original candidate creator if local).
- "youtube_url": string (only if is_external is true, provide a YouTube search query URL like "https://www.youtube.com/results?search_query=..." matching the recommendation topic).
`;

  let textOutput;
  try {
    // Try primary model (Gemini 1.5 Flash)
    textOutput = await callGeminiWithModel("gemini-1.5-flash", systemContext, apiKey);
  } catch (err) {
    console.warn(`Primary Model (gemini-1.5-flash) failed or rate-limited: ${err.message}. Retrying with failover model (gemini-1.5-pro)...`);
    
    // Failover to secondary model (Gemini 1.5 Pro)
    textOutput = await callGeminiWithModel("gemini-1.5-pro", systemContext, apiKey);
  }
  
  // Parse response JSON and render
  console.log("=========================================");
  console.log("🤖 LIVE AI RECOMMENDATION DISPATCHED");
  console.log("-----------------------------------------");
  console.log("Gemini Raw AI Response:\n", textOutput);
  console.log("=========================================");
  
  let cleanedText = textOutput.trim();
  if (cleanedText.startsWith("```")) {
    cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  }
  const parsedRecommendations = JSON.parse(cleanedText);
  console.log("Gemini Parsed Recommendations Array:\n", parsedRecommendations);
  
  // Dynamically register new categories to core category listing
  parsedRecommendations.forEach(item => {
    if (item.category && !CORE_CATEGORIES.includes(item.category)) {
      console.log(`Dynamic Category Discovery via LLM: Registering "${item.category}" to DNA tracking list.`);
      CORE_CATEGORIES.push(item.category);
    }
  });
  
  // Format API response, executing agentic dynamic DB cache expansion for external videos
  const formattedReels = parsedRecommendations.map((item, idx) => {
    // Check if recommendation is an external YouTube video
    if (item.is_external) {
      // Find if we already cached this external video in RECOMMENDED_LIBRARY
      let cached = RECOMMENDED_LIBRARY.find(r => r.title === item.recommended_tech_reel);
      if (!cached) {
        // Assign dynamic, high-quality category cover image
        let catThumb = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=120&auto=format&fit=crop"; // Code default
        if (item.category === "AI") catThumb = "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=120&auto=format&fit=crop";
        else if (item.category === "DSA") catThumb = "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=120&auto=format&fit=crop";
        else if (item.category === "Cloud") catThumb = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=120&auto=format&fit=crop";
        else if (item.category === "Cybersecurity") catThumb = "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=120&auto=format&fit=crop";
        else if (item.category === "Career") catThumb = "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=120&auto=format&fit=crop";
        else if (item.category === "Java") catThumb = "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=120&auto=format&fit=crop";
        else if (item.category === "HLD") catThumb = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=120&auto=format&fit=crop";

        // Dynamically insert/cache the external video into RECOMMENDED_LIBRARY
        cached = {
          id: `ext_${Date.now()}_${idx}`,
          title: item.recommended_tech_reel,
          creator: item.creator || "youtube_educator",
          thumbnail: catThumb,
          transcript: `External video suggested dynamically by AI Agent: ${item.why_this_recommendation}`,
          category: item.category,
          difficulty: item.difficulty,
          confidence_score: item.confidence,
          is_external: true,
          youtube_url: item.youtube_url || `https://www.youtube.com/results?search_query=${encodeURIComponent(item.recommended_tech_reel)}`,
          relevance_vector: {}
        };
        // Setup relevance vectors for offline engine compatibility
        cached.relevance_vector[item.category] = 0.9;
        RECOMMENDED_LIBRARY.push(cached);
        console.log(`Agentic DB Cache Expansion: Injected external video "${cached.title}" into Candidates Database.`);
      }

      cached.customExplanation = {
        currentReel: item.current_reel,
        interestDetected: item.interest_detected,
        whyEvidence: item.why,
        whyRecommend: item.why_this_recommendation
      };

      return cached;
    } else {
      // Find local candidate
      const original = RECOMMENDED_LIBRARY.find(r => r.title === item.recommended_tech_reel) || {
        title: item.recommended_tech_reel,
        creator: item.creator || "AI_Agent",
        category: item.category,
        difficulty: item.difficulty,
        confidence_score: item.confidence
      };

      original.customExplanation = {
        currentReel: item.current_reel,
        interestDetected: item.interest_detected,
        whyEvidence: item.why,
        whyRecommend: item.why_this_recommendation
      };

      return original;
    }
  });

  // Save globally for next-in-feed navigation injection
  window.activeRecommendations = formattedReels;

  // Render cards
  renderRecommendations(formattedReels);
}

/**
 * Render recommendations list into DOM
 */
function renderRecommendations(reels) {
  const container = document.getElementById("recommendationsList");
  container.innerHTML = "";

  if (reels.length === 0) {
    container.innerHTML = `<div class="recommendation-status">No recommendations matching your current interest vector. Scroll some more!</div>`;
    return;
  }

  reels.forEach(reel => {
    // Generate explanation details
    const explanation = reel.customExplanation || getExplainabilityFields(reel);

    const card = document.createElement("div");
    // Append external-card class for custom YouTube branding if external
    card.className = `schema-card category-${reel.category.toLowerCase()} ${reel.is_external ? 'external-card' : ''}`;
    
    // Choose badge coloring
    const diffClass = `difficulty-${reel.difficulty.toLowerCase()}`;
    const confClass = `confidence-${reel.confidence_score.toLowerCase()}`;

    // YouTube indicator tag
    const categoryTagText = reel.is_external ? `${reel.category} • YOUTUBE` : reel.category;
    const categoryTagClass = `schema-category-tag ${reel.is_external ? 'external-tag' : ''}`;

    card.innerHTML = `
      <div class="schema-card-header">
        <span class="${categoryTagClass}">${categoryTagText}</span>
        <div class="schema-metadata">
          <span class="meta-badge ${diffClass}">DIFFICULTY: ${reel.difficulty}</span>
          <span class="meta-badge ${confClass}">CONFIDENCE: ${reel.confidence_score}</span>
        </div>
      </div>
      
      <div class="schema-title">${reel.title}</div>
      <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: -6px;">by @${reel.creator}</div>

      <!-- Structured Schema Output -->
      <div class="schema-body">
        <div class="schema-field">
          <span class="schema-field-label">CURRENT REEL</span>
          <span class="schema-field-value">${explanation.currentReel}</span>
        </div>
        <div class="schema-field">
          <span class="schema-field-label">INTEREST DETECTED</span>
          <span class="schema-field-value highlight-value">${explanation.interestDetected}</span>
        </div>
        <div class="schema-field">
          <span class="schema-field-label">WHY</span>
          <span class="schema-field-value">${explanation.whyEvidence}</span>
        </div>
        <div class="schema-field">
          <span class="schema-field-label">RECOMMENDED TECH REEL</span>
          <span class="schema-field-value highlight-value">${reel.title}</span>
        </div>
        <div class="schema-field">
          <span class="schema-field-label">CATEGORY</span>
          <span class="schema-field-value">${reel.category}</span>
        </div>
        <div class="schema-field">
          <span class="schema-field-label">WHY THIS RECOMMENDATION</span>
          <span class="schema-field-value">${explanation.whyRecommend}</span>
        </div>
        <div class="schema-field">
          <span class="schema-field-label">DIFFICULTY</span>
          <span class="schema-field-value">${reel.difficulty}</span>
        </div>
        <div class="schema-field">
          <span class="schema-field-label">CONFIDENCE</span>
          <span class="schema-field-value">${reel.confidence_score}</span>
        </div>
      </div>
      
      ${reel.is_external ? `
        <a href="${reel.youtube_url}" target="_blank" class="external-link-btn">
          <span>▶ Watch on YouTube</span>
        </a>
      ` : ''}
    `;

    container.appendChild(card);
  });
}

// Export session logs as JSON report
window.exportSessionLog = function() {
  const reportData = {
    timestamp: new Date().toISOString(),
    sessionHistory: sessionHistory,
    inferredDNA: window.inferredDNA || {},
    recommendations: window.activeRecommendations || []
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reportData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `reelfocus_session_report_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};
