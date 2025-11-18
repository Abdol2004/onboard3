// Nigerian Institutions Database organized by State
const nigerianInstitutions = {
    "Abia": {
        "Federal University": ["Michael Okpara University of Agriculture, Umudike"],
        "State University": ["Abia State University, Uturu"],
        "Private University": ["Gregory University, Uturu", "Rhema University, Aba"],
        "Polytechnic": ["Abia State Polytechnic, Aba", "Federal Polytechnic, Owerri"],
        "College of Education": ["Abia State College of Education (Technical), Arochukwu"]
    },
    "Adamawa": {
        "Federal University": ["Modibbo Adama University of Technology, Yola"],
        "State University": ["Adamawa State University, Mubi"],
        "Private University": ["American University of Nigeria, Yola"],
        "Polytechnic": ["Adamawa State Polytechnic, Yola"],
        "College of Education": ["College of Education, Hong"]
    },
    "Akwa Ibom": {
        "Federal University": [],
        "State University": ["Akwa Ibom State University, Ikot Akpaden"],
        "Private University": ["Obong University, Obong Ntak"],
        "Polytechnic": ["Akwa Ibom State Polytechnic, Ikot Osurua"],
        "College of Education": ["College of Education, Afaha Nsit"]
    },
    "Anambra": {
        "Federal University": ["Nnamdi Azikiwe University, Awka"],
        "State University": ["Chukwuemeka Odumegwu Ojukwu University, Uli"],
        "Private University": ["Madonna University, Okija", "Paul University, Awka", "Tansian University, Umunya"],
        "Polytechnic": ["Federal Polytechnic, Oko"],
        "College of Education": ["Nwafor Orizu College of Education, Nsugbe"]
    },
    "Bauchi": {
        "Federal University": ["Abubakar Tafawa Balewa University, Bauchi"],
        "State University": ["Bauchi State University, Gadau"],
        "Private University": [],
        "Polytechnic": ["Abubakar Tatari Ali Polytechnic, Bauchi"],
        "College of Education": ["College of Education, Azare"]
    },
    "Bayelsa": {
        "Federal University": [],
        "State University": ["Niger Delta University, Wilberforce Island"],
        "Private University": [],
        "Polytechnic": ["Bayelsa State Polytechnic, Aleibiri"],
        "College of Education": ["Isaac Jasper Boro College of Education, Sagbama"]
    },
    "Benue": {
        "Federal University": ["University of Agriculture, Makurdi"],
        "State University": ["Benue State University, Makurdi"],
        "Private University": [],
        "Polytechnic": ["Benue State Polytechnic, Ugbokolo"],
        "College of Education": ["College of Education, Katsina-Ala"]
    },
    "Borno": {
        "Federal University": ["University of Maiduguri"],
        "State University": [],
        "Private University": [],
        "Polytechnic": ["Ramat Polytechnic, Maiduguri"],
        "College of Education": ["Kashim Ibrahim College of Education, Maiduguri"]
    },
    "Cross River": {
        "Federal University": ["University of Calabar"],
        "State University": ["Cross River University of Technology, Calabar"],
        "Private University": ["Arthur Jarvis University, Akpabuyo"],
        "Polytechnic": ["Cross River State Polytechnic, Calabar"],
        "College of Education": ["College of Education, Akamkpa"]
    },
    "Delta": {
        "Federal University": ["Federal University of Petroleum Resources, Effurun"],
        "State University": ["Delta State University, Abraka"],
        "Private University": ["Novena University, Ogume", "Western Delta University, Oghara"],
        "Polytechnic": ["Delta State Polytechnic, Ogwashi-Uku", "Delta State Polytechnic, Ozoro"],
        "College of Education": ["College of Education, Agbor", "College of Education, Warri"]
    },
    "Ebonyi": {
        "Federal University": ["Alex Ekwueme Federal University, Ndufu-Alike"],
        "State University": ["Ebonyi State University, Abakaliki"],
        "Private University": [],
        "Polytechnic": ["Akanu Ibiam Federal Polytechnic, Unwana"],
        "College of Education": ["College of Education, Ikwo"]
    },
    "Edo": {
        "Federal University": ["University of Benin"],
        "State University": ["Ambrose Alli University, Ekpoma"],
        "Private University": ["Benson Idahosa University, Benin City", "Igbinedion University, Okada", "Wellspring University, Benin City"],
        "Polytechnic": ["Auchi Polytechnic, Auchi", "Institute of Management and Technology, Usen"],
        "College of Education": ["College of Education, Ekiadolor", "College of Education, Igueben"]
    },
    "Ekiti": {
        "Federal University": ["Federal University, Oye-Ekiti"],
        "State University": ["Ekiti State University, Ado Ekiti"],
        "Private University": ["Afe Babalola University, Ado-Ekiti"],
        "Polytechnic": ["Federal Polytechnic, Ado-Ekiti"],
        "College of Education": ["College of Education, Ikere-Ekiti"]
    },
    "Enugu": {
        "Federal University": ["University of Nigeria, Nsukka"],
        "State University": ["Enugu State University of Science and Technology"],
        "Private University": ["Caritas University, Enugu", "Godfrey Okoye University, Enugu", "Renaissance University, Enugu"],
        "Polytechnic": ["Institute of Management and Technology, Enugu"],
        "College of Education": ["Enugu State College of Education (Technical), Enugu"]
    },
    "FCT": {
        "Federal University": ["University of Abuja"],
        "State University": [],
        "Private University": ["Baze University, Abuja", "Nile University of Nigeria, Abuja", "Veritas University, Abuja"],
        "Polytechnic": [],
        "College of Education": ["Federal College of Education, Zuba"]
    },
    "Gombe": {
        "Federal University": ["Federal University, Kashere"],
        "State University": ["Gombe State University"],
        "Private University": [],
        "Polytechnic": ["Gombe State Polytechnic"],
        "College of Education": ["College of Education, Billiri"]
    },
    "Imo": {
        "Federal University": ["Federal University of Technology, Owerri"],
        "State University": ["Imo State University, Owerri"],
        "Private University": ["Eastern Palm University, Ogboko", "Gregory University, Uturu"],
        "Polytechnic": ["Federal Polytechnic, Nekede"],
        "College of Education": ["Alvan Ikoku Federal College of Education, Owerri"]
    },
    "Jigawa": {
        "Federal University": ["Federal University, Dutse"],
        "State University": ["Jigawa State University, Kafin Hausa"],
        "Private University": [],
        "Polytechnic": ["Jigawa State Polytechnic, Dutse"],
        "College of Education": ["College of Education, Gumel"]
    },
    "Kaduna": {
        "Federal University": ["Ahmadu Bello University, Zaria"],
        "State University": ["Kaduna State University"],
        "Private University": ["Greenfield University, Kaduna"],
        "Polytechnic": ["Kaduna Polytechnic", "Nuhu Bamalli Polytechnic, Zaria"],
        "College of Education": ["Federal College of Education, Zaria"]
    },
    "Kano": {
        "Federal University": ["Bayero University, Kano"],
        "State University": ["Kano University of Science and Technology, Wudil"],
        "Private University": ["Capital City University, Kano"],
        "Polytechnic": ["Kano State Polytechnic"],
        "College of Education": ["Federal College of Education, Kano"]
    },
    "Katsina": {
        "Federal University": ["Federal University, Dutsin-Ma"],
        "State University": ["Umaru Musa Yar'adua University, Katsina"],
        "Private University": [],
        "Polytechnic": ["Hassan Usman Katsina Polytechnic"],
        "College of Education": ["Federal College of Education, Katsina"]
    },
    "Kebbi": {
        "Federal University": ["Federal University, Birnin Kebbi"],
        "State University": ["Kebbi State University of Science and Technology, Aliero"],
        "Private University": [],
        "Polytechnic": ["Waziri Umaru Federal Polytechnic, Birnin Kebbi"],
        "College of Education": ["Federal College of Education (Technical), Gusau"]
    },
    "Kogi": {
        "Federal University": ["Federal University, Lokoja"],
        "State University": ["Kogi State University, Anyigba", "Prince Abubakar Audu University, Anyigba"],
        "Private University": ["Salem University, Lokoja"],
        "Polytechnic": ["Federal Polytechnic, Idah", "Kogi State Polytechnic, Lokoja"],
        "College of Education": ["College of Education, Ankpa"]
    },
    "Kwara": {
        "Federal University": ["University of Ilorin"],
        "State University": ["Kwara State University, Malete"],
        "Private University": ["Al-Hikmah University, Ilorin", "Landmark University, Omu-Aran", "Summit University, Offa"],
        "Polytechnic": ["Federal Polytechnic, Offa", "Kwara State Polytechnic, Ilorin"],
        "College of Education": ["College of Education, Ilorin"]
    },
    "Lagos": {
        "Federal University": ["University of Lagos"],
        "State University": ["Lagos State University", "Lagos State University of Science and Technology, Ikorodu"],
        "Private University": ["Caleb University, Lagos", "Pan-Atlantic University, Lagos"],
        "Polytechnic": ["Yaba College of Technology", "Lagos State Polytechnic, Ikorodu"],
        "College of Education": ["Federal College of Education (Technical), Akoka", "Adeniran Ogunsanya College of Education"]
    },
    "Nasarawa": {
        "Federal University": ["Federal University, Lafia"],
        "State University": ["Nasarawa State University, Keffi"],
        "Private University": ["Bingham University, Karu"],
        "Polytechnic": ["Federal Polytechnic, Nasarawa"],
        "College of Education": ["College of Education, Akwanga"]
    },
    "Niger": {
        "Federal University": ["Federal University of Technology, Minna"],
        "State University": ["Ibrahim Badamasi Babangida University, Lapai"],
        "Private University": [],
        "Polytechnic": ["Federal Polytechnic, Bida"],
        "College of Education": ["Federal College of Education, Kontagora"]
    },
    "Ogun": {
        "Federal University": ["Federal University of Agriculture, Abeokuta"],
        "State University": ["Olabisi Onabanjo University, Ago-Iwoye", "Tai Solarin University of Education, Ijagun"],
        "Private University": ["Babcock University, Ilishan-Remo", "Bells University of Technology, Ota", "Covenant University, Ota", "Crawford University, Igbesa"],
        "Polytechnic": ["Federal Polytechnic, Ilaro", "Gateway Polytechnic, Saapade"],
        "College of Education": ["Federal College of Education, Abeokuta"]
    },
    "Ondo": {
        "Federal University": ["Federal University of Technology, Akure"],
        "State University": ["Adekunle Ajasin University, Akungba-Akoko", "Ondo State University of Science and Technology, Okitipupa"],
        "Private University": ["Achievers University, Owo"],
        "Polytechnic": ["Rufus Giwa Polytechnic, Owo"],
        "College of Education": ["Adeyemi College of Education, Ondo"]
    },
    "Osun": {
        "Federal University": ["Obafemi Awolowo University, Ile-Ife"],
        "State University": ["Osun State University, Osogbo"],
        "Private University": ["Adeleke University, Ede", "Bowen University, Iwo", "Fountain University, Osogbo", "Redeemer's University, Ede"],
        "Polytechnic": ["Federal Polytechnic, Ede", "Osun State Polytechnic, Iree"],
        "College of Education": ["College of Education, Ila-Orangun", "College of Education, Ikere-Ekiti"]
    },
    "Oyo": {
        "Federal University": ["University of Ibadan"],
        "State University": ["Ladoke Akintola University of Technology, Ogbomoso"],
        "Private University": ["Lead City University, Ibadan", "Ajayi Crowther University, Oyo"],
        "Polytechnic": ["The Polytechnic, Ibadan", "Federal College of Animal Health and Production Technology, Ibadan"],
        "College of Education": ["Emmanuel Alayande College of Education, Oyo"]
    },
    "Plateau": {
        "Federal University": ["University of Jos"],
        "State University": ["Plateau State University, Bokkos"],
        "Private University": [],
        "Polytechnic": ["Plateau State Polytechnic, Barkin Ladi"],
        "College of Education": ["Federal College of Education, Pankshin"]
    },
    "Rivers": {
        "Federal University": ["University of Port Harcourt"],
        "State University": ["Rivers State University, Port Harcourt", "Ignatius Ajuru University of Education, Port Harcourt"],
        "Private University": ["Clifford University, Owerrinta"],
        "Polytechnic": ["Ken Saro-Wiwa Polytechnic, Bori", "Captain Elechi Amadi Polytechnic, Port Harcourt"],
        "College of Education": ["Federal College of Education (Technical), Omoku"]
    },
    "Sokoto": {
        "Federal University": ["Usmanu Danfodiyo University, Sokoto"],
        "State University": ["Sokoto State University"],
        "Private University": [],
        "Polytechnic": ["Sokoto State Polytechnic"],
        "College of Education": ["Federal College of Education (Technical), Gusau"]
    },
    "Taraba": {
        "Federal University": ["Federal University, Wukari"],
        "State University": ["Taraba State University, Jalingo"],
        "Private University": [],
        "Polytechnic": ["Taraba State Polytechnic, Suntai"],
        "College of Education": ["College of Agriculture, Jalingo"]
    },
    "Yobe": {
        "Federal University": ["Federal University, Gashua"],
        "State University": ["Yobe State University, Damaturu"],
        "Private University": [],
        "Polytechnic": ["Mai Idris Alooma Polytechnic, Geidam"],
        "College of Education": ["College of Education, Gashua"]
    },
    "Zamfara": {
        "Federal University": ["Federal University, Gusau"],
        "State University": ["Zamfara State University"],
        "Private University": [],
        "Polytechnic": ["Zamfara State College of Agriculture"],
        "College of Education": ["Federal College of Education (Technical), Gusau"]
    }
};

// Populate states dropdown
function populateStates() {
    const stateSelect = document.getElementById('stateSelect');
    Object.keys(nigerianInstitutions).sort().forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        stateSelect.appendChild(option);
    });
}

// Handle state selection
document.getElementById('stateSelect').addEventListener('change', function() {
    const selectedState = this.value;
    const institutionTypeSelect = document.getElementById('institutionType');
    const institutionNameSelect = document.getElementById('institutionName');
    
    // Reset subsequent dropdowns
    institutionTypeSelect.innerHTML = '<option value="">-- Select institution type --</option>';
    institutionNameSelect.innerHTML = '<option value="">-- Select your institution --</option>';
    
    if (selectedState && nigerianInstitutions[selectedState]) {
        const types = Object.keys(nigerianInstitutions[selectedState]);
        types.forEach(type => {
            if (nigerianInstitutions[selectedState][type].length > 0) {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                institutionTypeSelect.appendChild(option);
            }
        });
    }
});

// Handle institution type selection
document.getElementById('institutionType').addEventListener('change', function() {
    const selectedState = document.getElementById('stateSelect').value;
    const selectedType = this.value;
    const institutionNameSelect = document.getElementById('institutionName');
    
    institutionNameSelect.innerHTML = '<option value="">-- Select your institution --</option>';
    
    if (selectedState && selectedType && nigerianInstitutions[selectedState][selectedType]) {
        nigerianInstitutions[selectedState][selectedType].forEach(institution => {
            const option = document.createElement('option');
            option.value = institution;
            option.textContent = institution;
            institutionNameSelect.appendChild(option);
        });
    }
});

// Load user's application status
async function loadMyApplication() {
    try {
        const response = await fetch('/api/campus-ambassador/my-application');
        const data = await response.json();
        
        const container = document.getElementById('myAmbassadorApplication');
        
        if (data.success && data.application) {
            // User has already applied
            const app = data.application;
            const statusBadge = getStatusBadge(app.status);
            
            container.innerHTML = `
                <div style="background: rgba(57,255,20,0.05); padding: 2rem; border-radius: 12px; border: 1px solid rgba(57,255,20,0.2);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1.5rem;">
                        <div>
                            <h4 style="color: #39FF14; margin: 0 0 0.5rem 0;">Application Status</h4>
                            ${statusBadge}
                        </div>
                        <div style="text-align: right; color: #888; font-size: 0.9rem;">
                            <p style="margin: 0;">Submitted: ${new Date(app.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1.5rem;">
                        <div>
                            <p style="color: #888; font-size: 0.85rem; margin: 0;">Institution</p>
                            <p style="color: #fff; margin: 0.25rem 0 0 0;">${app.institutionName}</p>
                        </div>
                        <div>
                            <p style="color: #888; font-size: 0.85rem; margin: 0;">State</p>
                            <p style="color: #fff; margin: 0.25rem 0 0 0;">${app.state}</p>
                        </div>
                        <div>
                            <p style="color: #888; font-size: 0.85rem; margin: 0;">Course</p>
                            <p style="color: #fff; margin: 0.25rem 0 0 0;">${app.courseOfStudy}</p>
                        </div>
                        <div>
                            <p style="color: #888; font-size: 0.85rem; margin: 0;">Level</p>
                            <p style="color: #fff; margin: 0.25rem 0 0 0;">${app.currentLevel}</p>
                        </div>
                    </div>

                       ${app.status === 'approved' || app.status === 'pending' ? `
                        <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(57,255,20,0.2);">
                            <h4 style="color: #39FF14; margin: 0 0 1rem 0;">${app.status === 'approved' ? 'Connect with Community' : 'Stay Updated While We Review'}</h4>
                            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                                <a href="https://twitter.com/Onboard3_" target="_blank" class="btn btn-primary" style="text-decoration: none;">
                                    <i class="fab fa-twitter"></i> Follow ONBOARD3
                                </a>
                                <a href="https://t.me/+YOUR_TELEGRAM" target="_blank" class="btn btn-secondary" style="text-decoration: none;">
                                    <i class="fab fa-telegram"></i> Join Telegram
                                </a>
                                <a href="https://discord.gg/YOUR_DISCORD" target="_blank" class="btn btn-secondary" style="text-decoration: none;">
                                    <i class="fab fa-discord"></i> Join Discord
                                </a>
                                <a href="https://twitter.com/YOUR_FOUNDER" target="_blank" class="btn btn-secondary" style="text-decoration: none;">
                                    <i class="fas fa-user"></i> Follow Founder
                                </a>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${app.adminNotes ? `
                        <div style="margin-top: 1rem; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
                            <p style="color: #888; font-size: 0.85rem; margin: 0 0 0.5rem 0;">Admin Notes:</p>
                            <p style="color: #fff; margin: 0;">${app.adminNotes}</p>
                        </div>
                    ` : ''}
                </div>
            `;
            
            // Hide the application form
            document.getElementById('ambassadorApplicationForm').parentElement.style.display = 'none';
            
        } else {
            // No application yet - show social links
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #888;">
                    <i class="fas fa-clipboard" style="font-size: 3rem; color: #39FF14; margin-bottom: 1rem;"></i>
                    <p>You haven't submitted an application yet.</p>
                    <p style="font-size: 0.9rem;">Fill out the form below to become a Campus Ambassador!</p>
                    
                    <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(57,255,20,0.2);">
                        <h4 style="color: #39FF14; margin: 0 0 1rem 0;">Stay Updated - Follow Us</h4><p>Make sure you retweet our pinned post</p>
                        <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
                            <a href="https://x.com/Onboard3___" target="_blank" class="btn btn-primary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem;">
                                <i class="fab fa-twitter"></i> Follow ONBOARD3
                            </a>
                            <a href="https://t.me/onboard_3" target="_blank" class="btn btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem;">
                                <i class="fab fa-telegram"></i> Join Telegram
                            </a>
                            <a href="https://discord.com/invite/EmyGK87r" target="_blank" class="btn btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem;">
                                <i class="fab fa-discord"></i> Join Discord
                            </a>
                            <a href="https://x.com/beebrain123" target="_blank" class="btn btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-user"></i> Follow Founder
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading application:', error);
        document.getElementById('myAmbassadorApplication').innerHTML = `
            <p style="color: #ff4444; text-align: center; padding: 2rem;">Failed to load application status</p>
        `;
    }
}

// Get status badge HTML
function getStatusBadge(status) {
    const badges = {
        pending: '<span style="background: #FFA500; color: #000; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600;"><i class="fas fa-clock"></i> Pending Review</span>',
        approved: '<span style="background: #39FF14; color: #000; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600;"><i class="fas fa-check-circle"></i> Approved</span>',
        rejected: '<span style="background: #ff4444; color: #fff; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600;"><i class="fas fa-times-circle"></i> Rejected</span>'
    };
    return badges[status] || badges.pending;
}

// Handle form submission
document.getElementById('ambassadorApplicationForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    
    const formData = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        state: document.getElementById('stateSelect').value,
        institutionType: document.getElementById('institutionType').value,
        institutionName: document.getElementById('institutionName').value,
        courseOfStudy: document.getElementById('courseOfStudy').value,
        currentLevel: document.getElementById('currentLevel').value,
        twitter: document.getElementById('twitter').value,
        telegram: document.getElementById('telegram').value,
        motivation: document.getElementById('motivation').value,
        experience: document.getElementById('experience').value,
        promotionPlan: document.getElementById('promotionPlan').value
    };
    
    try {
        const response = await fetch('/api/campus-ambassador/apply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ ' + data.message);
            // Reload the page to show the application status
            window.location.reload();
        } else {
            alert('❌ ' + data.error);
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Submission error:', error);
        alert('❌ Failed to submit application. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    populateStates();
    loadMyApplication();
});