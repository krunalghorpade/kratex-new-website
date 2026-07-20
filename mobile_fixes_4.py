import re

css_file = 'style.css'
with open(css_file, 'r') as f:
    css = f.read()

# Overall: Join for free button rounded
css = css.replace('.btn-subscribe {\n    display: inline-block;\n    padding: 1rem 3rem;\n    font-size: 1.2rem;\n    background: var(--text-color);\n    color: var(--bg-dark);\n    text-decoration: none;\n    font-weight: 700;\n    transition: opacity 0.3s ease;\n}', '.btn-subscribe {\n    display: inline-block;\n    padding: 1rem 3rem;\n    font-size: 1.2rem;\n    background: var(--text-color);\n    color: var(--bg-dark);\n    text-decoration: none;\n    font-weight: 700;\n    transition: opacity 0.3s ease;\n    border-radius: 50px;\n}')

# Overall: Footer restructure
old_footer_grid = """.footer-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 3rem;
    text-align: left;
    margin-bottom: 3rem;
}"""
new_footer_grid = """.footer-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    text-align: left;
    margin-bottom: 3rem;
}
.footer-col:nth-child(1) { order: 1; grid-column: 1 / 2; }
.footer-col:nth-child(3) { order: 2; grid-column: 2 / 3; }
.footer-col:nth-child(2) { order: 3; grid-column: 1 / -1; margin-top: 1rem; }
.footer-col:nth-child(4) { order: 4; grid-column: 1 / -1; margin-top: 1rem; }"""
css = css.replace(old_footer_grid, new_footer_grid)

# Ensure mobile footer grid doesn't override this negatively
old_mobile_footer = """.footer-grid {
        grid-template-columns: 1fr 1fr;
    }"""
css = css.replace(old_mobile_footer, "")


# Mobile View Additions
new_mobile_css = """
    /* Mobile Titles Center Aligned */
    .section-header {
        text-align: center;
        align-items: center;
    }
    
    /* Countdown Block Center Aligned & Stretched */
    .countdown {
        width: 100%;
        justify-content: center;
    }
    
    /* Merch block size reduce */
    .merch-item {
        flex: 0 0 40vw !important;
        max-width: 40vw !important;
    }
    
    /* Album Image Height */
    .album-image-wrapper {
        height: auto;
        max-height: none;
    }
    
    /* Mobile Links Spacing */
    .mobile-nav-links {
        gap: 3.5rem !important;
    }
    
    /* Hero 70% height */
    .hero-video {
        height: 70vh !important;
        min-height: 70vh !important;
    }
"""

css = css.replace('@media (max-width: 768px) {', '@media (max-width: 768px) {' + new_mobile_css)

with open(css_file, 'w') as f:
    f.write(css)

print("Done")
