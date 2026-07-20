document.addEventListener('DOMContentLoaded', () => {
    initCountdown();
    fetchBandsintownEvents();
    initScrollEffect();
    initVideoHover();
    initSubscribeForm();
    
    // Mobile Menu Logic
    const hamburger = document.getElementById('hamburger-menu');
    const closeBtn = document.getElementById('close-menu');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-link');
    
    if (hamburger && closeBtn && mobileMenu) {
        hamburger.addEventListener('click', () => {
            mobileMenu.classList.add('active');
        });
        
        closeBtn.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
        });
        
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('active');
            });
        });
    }
});

async function initScrollEffect() {
    try {
        const res = await fetch('settings.json');
        const settings = await res.json();
        
        // Apply Global Typography Settings
        const style = document.createElement('style');
        style.innerHTML = `
            :root {
                --show-divider-thickness: ${settings.showDividerThickness || '1px'};
                --tour-divider-opacity: ${settings.tourDividerOpacity || '0.5'};
            }
            body, h1, h2, h3, h4, p, a, span, div, .btn-tv {
                text-transform: ${settings.textTransform || 'none'} !important;
                letter-spacing: ${settings.letterSpacing || 'normal'} !important;
            }
            .hero-bg-video {
                filter: contrast(${settings.heroVideoContrast || '1'});
            }
        `;
        document.head.appendChild(style);

        const scrim = document.getElementById('video-scrim');
        
        if (scrim) {
            const initialDarkness = settings.initialVideoDarkness !== undefined ? settings.initialVideoDarkness : 0;
            const scrollDarkness = settings.videoDarknessOnScroll !== undefined ? settings.videoDarknessOnScroll : 0.7;
            
            // Set initial state
            scrim.style.opacity = initialDarkness;
            
            window.addEventListener('scroll', () => {
                const heroHeight = window.innerHeight * 0.5;
                if (window.scrollY > heroHeight) {
                    scrim.style.opacity = scrollDarkness;
                } else {
                    scrim.style.opacity = initialDarkness;
                }
            });
        }
        } catch (e) {
        console.error("Error loading settings.json", e);
    }
}

async function fetchBandsintownEvents() {
    const container = document.getElementById('bandsintown-events');
    const appId = 'a6c091218a1b4ce7722331b71949efd4';
    const artistName = 'Kratex';
    const url = `https://rest.bandsintown.com/artists/${artistName}/events?app_id=${appId}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const events = await response.json();
        
        container.innerHTML = ''; // Clear loading text
        
        if (events.length === 0) {
            container.innerHTML = '<p>NO UPCOMING DATES.</p>';
            return;
        }

        events.forEach(event => {
            const dateObj = new Date(event.starts_at);
            const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
            const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
            
            const month = monthNames[dateObj.getMonth()];
            const year = dateObj.getFullYear().toString().slice(-2);
            const dateNum = dateObj.getDate().toString().padStart(2, '0');
            const dayOfWeek = dayNames[dateObj.getDay()];
            
            const city = event.venue.city.toUpperCase();
            let rawVenue = event.venue.name;
            rawVenue = rawVenue.replace(/\b(?:x|ft\.?|@|featuring|with)\s+kratex\b/gi, '')
                               .replace(/\bkratex\s+(?:x|ft\.?|@|featuring|with)\b/gi, '')
                               .replace(/\bkratex\b/gi, '')
                               .replace(/^[^\w]+|[^\w]+$/g, '')
                               .trim();
            if (!rawVenue) rawVenue = event.venue.city || 'TBA';
            
            const venue = rawVenue.toUpperCase();
            const title = (event.title || 'LIVE SET').toUpperCase();
            
            let ticketLink = '#';
            if (event.offers && event.offers.length > 0) {
                const ticketOffer = event.offers.find(o => o.type === 'Tickets' && o.status === 'available');
                if (ticketOffer) {
                    ticketLink = ticketOffer.url;
                }
            }

            const itemDiv = document.createElement('a');
            itemDiv.className = 'tour-item';
            itemDiv.href = ticketLink;
            itemDiv.target = '_blank';
            
            const fullYear = dateObj.getFullYear();
            
            itemDiv.innerHTML = `
                <div class="tour-left">
                    <span class="date">🗓️ ${dateNum} ${month}, ${fullYear}</span>
                    <span class="day">${dayOfWeek}</span>
                </div>
                <div class="tour-middle">
                    <span class="title">${title}</span>
                    <span class="location">📍 ${venue}, ${city}</span>
                </div>
                <div class="tour-right">
                    <span class="btn-tv book-btn">🎫 🔗 Book Now</span>
                </div>
            `;
            
            container.appendChild(itemDiv);
        });

    } catch (error) {
        console.error('Error fetching events:', error);
        container.innerHTML = '<p>UNABLE TO LOAD DATES.</p>';
    }
}

// Album Countdown Logic
function initCountdown() {
    // Release Date: 31st July 2026, 12:00 PM IST
    const releaseDate = new Date('2026-07-31T12:00:00+05:30').getTime();
    
    const daysEl = document.getElementById('cd-days');
    const hoursEl = document.getElementById('cd-hours');
    const minsEl = document.getElementById('cd-mins');
    const secsEl = document.getElementById('cd-secs');

    if (!daysEl) return; 

    function update() {
        const now = new Date().getTime();
        const distance = releaseDate - now;

        if (distance < 0) {
            daysEl.innerText = '00';
            hoursEl.innerText = '00';
            minsEl.innerText = '00';
            secsEl.innerText = '00';
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        daysEl.innerText = days.toString().padStart(2, '0');
        hoursEl.innerText = hours.toString().padStart(2, '0');
        minsEl.innerText = minutes.toString().padStart(2, '0');
        secsEl.innerText = seconds.toString().padStart(2, '0');
    }
    
    update();
    setInterval(update, 1000);
}

// Video Hover Pause Logic
function initVideoHover() {
    const btnTv = document.querySelector('.hero-overlay .btn-tv');
    const heroVideo = document.querySelector('.hero-bg-video');

    if (btnTv && heroVideo) {
        btnTv.addEventListener('mouseenter', () => {
            heroVideo.pause();
        });
        btnTv.addEventListener('mouseleave', () => {
            heroVideo.play();
        });
    }
}

function initSubscribeForm() {
    const form = document.getElementById('subscribe-form');
    const emailInput = document.getElementById('subscribe-email');
    const subscribeBtn = document.getElementById('subscribe-btn');

    if (!form || !emailInput || !subscribeBtn) return;

    // Simple email validation regex
    const isValidEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleInput = (e) => {
        const email = e.target.value.trim();
        if (isValidEmail(email)) {
            subscribeBtn.classList.remove('btn-disabled');
            subscribeBtn.href = `https://www.bandsintown.com/artist-subscribe/15525088?came_from=701&spn=1&signature=ZZ9dfbc80df9c61962408fde1d904ff938310c5694f290cb54f169d1a05415ce8c&newsletter_email=${encodeURIComponent(email)}`;
        } else {
            subscribeBtn.classList.add('btn-disabled');
            subscribeBtn.href = '#';
        }
    };
    
    ['input', 'change', 'keyup'].forEach(eventType => {
        emailInput.addEventListener(eventType, handleInput);
    });

    // Prevent form default submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        if (isValidEmail(email)) {
            window.open(subscribeBtn.href, '_blank');
        }
    });
}
