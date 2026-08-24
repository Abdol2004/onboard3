// Add to your main JavaScript file
document.addEventListener('DOMContentLoaded', function() {
    // Create preloader element
    const preloader = document.createElement('div');
    preloader.id = 'preloader';
    preloader.innerHTML = `
        <div class="loader"></div>
    `;
    document.body.appendChild(preloader);
    
    // Hide preloader initially
    preloader.style.display = 'none';
    
    // Show preloader on navigation
    document.querySelectorAll('a, button[type="submit"]').forEach(element => {
        element.addEventListener('click', function(e) {
            // Only show for actual navigation (not # links or preventDefault buttons)
            if (this.getAttribute('href') !== '#' && !e.defaultPrevented) {
                preloader.style.display = 'flex';
            }
        });
    });
    
    // Show preloader on form submissions
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function() {
            preloader.style.display = 'flex';
        });
    });
});