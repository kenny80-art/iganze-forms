
// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2u3jsutbNafWDY3CE-J6XnpTdjD5Cjw0",
  authDomain: "iganzeprotocol-form.firebaseapp.com",
  projectId: "iganzeprotocol-form",
  storageBucket: "iganzeprotocol-form.firebasestorage.app",
  messagingSenderId: "468067088842",
  appId: "1:468067088842:web:6257e3abf04cd909f07733",
  measurementId: "G-PMTKR2F232"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    
    // Form elements
    const form = document.getElementById('registrationForm');
    const submitBtn = document.querySelector('.submit-btn');

    // Profile Image elements
    const profileImageInput = document.getElementById('profileImage');
    const profilePlaceholder = document.getElementById('profilePlaceholder');
    const profilePreview = document.getElementById('profilePreview');
    const previewImage = document.getElementById('previewImage');
    const removeImageBtn = document.getElementById('removeImage');
    const imageError = document.getElementById('imageError');

    // Modal elements
    const errorModal = document.getElementById('errorModal');
    const modalClose = document.getElementById('modalClose');
    const modalMessage = document.getElementById('modalMessage');

    // Image configuration - Firebase supports larger files
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB for Firebase Storage

    // Profile Image handling
    if (profileImageInput) {
        profileImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            
            if (!file) return;
            
            // Validate file type
            if (!file.type.match(/image\/(jpeg|jpg|png|gif|webp)/)) {
                showModal('Please select a valid image file (JPEG, JPG, PNG, GIF, or WebP).');
                return;
            }
            
            // Validate file size
            if (file.size > MAX_IMAGE_SIZE) {
                const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
                showModal(`Your image is ${fileSizeMB}MB which exceeds the 5MB limit.`);
                return;
            }
            
            // Read and preview image
            const reader = new FileReader();
            reader.onload = function(event) {
                if (previewImage) previewImage.src = event.target.result;
                if (profilePlaceholder) profilePlaceholder.style.display = 'none';
                if (profilePreview) profilePreview.style.display = 'block';
                if (removeImageBtn) removeImageBtn.style.display = 'flex';
                clearImageError();
            };
            reader.onerror = function() {
                showModal('Error reading file. Please try again.');
            };
            reader.readAsDataURL(file);
        });
    }

    // Remove image
    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', function() {
            resetProfileImage();
        });
    }

    // Modal functions
    function showModal(message) {
        if (!errorModal || !modalMessage) {
            alert(message);
            return;
        }
        modalMessage.textContent = message;
        errorModal.style.display = 'flex';
        errorModal.style.opacity = '1';
    }

    function hideModal() {
        if (errorModal) {
            errorModal.style.display = 'none';
            errorModal.style.opacity = '0';
        }
    }

    // Close modal on button click
    if (modalClose) {
        modalClose.addEventListener('click', hideModal);
    }

    // Close modal on overlay click
    if (errorModal) {
        errorModal.addEventListener('click', function(e) {
            if (e.target === errorModal) {
                hideModal();
            }
        });
    }

    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && errorModal && errorModal.style.display === 'flex') {
            hideModal();
        }
    });

    function clearImageError() {
        if (imageError) {
            imageError.textContent = '';
        }
        if (profilePlaceholder) {
            profilePlaceholder.style.borderColor = '';
        }
    }

    function resetProfileImage() {
        if (profileImageInput) profileImageInput.value = '';
        if (previewImage) previewImage.src = '';
        if (profilePlaceholder) profilePlaceholder.style.display = 'flex';
        if (profilePreview) profilePreview.style.display = 'none';
        if (removeImageBtn) removeImageBtn.style.display = 'none';
        clearImageError();
    }

    // Form validation patterns
    const patterns = {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/
    };

    // Real-time validation
    const inputs = form.querySelectorAll('input:not([type="radio"]), select, textarea');

    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => {
            if (input.classList.contains('error')) {
                validateField(input);
            }
        });
    });

    // Validate individual field
    function validateField(field) {
        const formGroup = field.closest('.form-group');
        const errorMessage = formGroup.querySelector('.error-message');
        let isValid = true;
        let message = '';

        // Check if field is required and empty
        if (field.hasAttribute('required') && !field.value.trim()) {
            isValid = false;
            message = 'This field is required';
        }
        // Email validation
        else if (field.type === 'email' && field.value && !patterns.email.test(field.value)) {
            isValid = false;
            message = 'Please enter a valid email address';
        }
        // Phone validation
        else if (field.type === 'tel' && field.value && !patterns.phone.test(field.value)) {
            isValid = false;
            message = 'Please enter a valid phone number';
        }
        // Date of birth validation (must be in the past)
        else if (field.id === 'dob' && field.value) {
            const selectedDate = new Date(field.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selectedDate >= today) {
                isValid = false;
                message = 'Date of birth must be in the past';
            }
        }

        // Update UI
        if (isValid) {
            formGroup.classList.remove('error');
            errorMessage.textContent = '';
        } else {
            formGroup.classList.add('error');
            errorMessage.textContent = message;
        }

        return isValid;
    }

    // Validate radio groups
    function validateRadioGroup(name) {
        const radioGroup = form.querySelector(`input[name="${name}"]`).closest('.form-group');
        const errorMessage = radioGroup.querySelector('.error-message');
        const isChecked = form.querySelector(`input[name="${name}"]:checked`);

        if (!isChecked) {
            radioGroup.classList.add('error');
            errorMessage.textContent = 'Please select an option';
            return false;
        } else {
            radioGroup.classList.remove('error');
            errorMessage.textContent = '';
            return true;
        }
    }

    // Validate entire form
    function validateForm() {
        let isValid = true;

        // Validate all input fields
        inputs.forEach(input => {
            if (!validateField(input)) {
                isValid = false;
            }
        });

        // Validate radio groups
        if (!validateRadioGroup('gender')) isValid = false;
        if (!validateRadioGroup('experienceRating')) isValid = false;
        return isValid;
    }

    // Handle form submission using Firebase
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            // Scroll to first error
            const firstError = form.querySelector('.form-group.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'auto', block: 'center' });
            }
            return;
        }

        // Show loading state
        submitBtn.classList.add('loading');

        try {
            // Get form data
            const formData = new FormData(form);
            
            // Combine address fields
            const fullAddress = `${formData.get('country') || ''}, ${formData.get('city') || ''}, ${formData.get('district') || ''}, ${formData.get('sector') || ''}`;
            
            // Prepare data object
            const submissionData = {
                title: formData.get('title'),
                fullName: formData.get('fullName'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                purpose: formData.get('purpose'),
                address: fullAddress,
                gender: formData.get('gender'),
                dob: formData.get('dob'),
                idNumber: formData.get('idNumber'),
                registrationDate: formData.get('registrationDate'),
                experienceRating: formData.get('experienceRating'),
                submissionDate: new Date().toLocaleString(),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Handle profile image - store as base64 in Firestore (no storage needed)
            if (profileImageInput && profileImageInput.files.length > 0) {
                const file = profileImageInput.files[0];
                
                // Read file as base64 using FileReader
                const base64Data = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                
                submissionData.profileImage = base64Data;
                submissionData.hasImage = true;
            } else {
                submissionData.hasImage = false;
            }

            // Save to Firestore
            await db.collection('registrations').add(submissionData);

            console.log('Form submitted successfully!');
            
            // Store success state
            sessionStorage.setItem('formSubmitted', 'true');
            
            // Redirect to success page
            window.location.href = 'success.html';

        } catch (error) {
            console.error('Error submitting form:', error);
            
            // Remove loading state
            submitBtn.classList.remove('loading');

            // Show error message
            alert('Sorry, there was an error submitting your form: ' + error.message);
        }
    });

    // Auto-save form data to prevent data loss
    function autoSaveForm() {
        const formData = {};
        inputs.forEach(input => {
            if (input.value) {
                formData[input.id || input.name] = input.value;
            }
        });

        // Save radio button selections
        const radioGroups = ['gender', 'experienceRating'];
        radioGroups.forEach(name => {
            const selected = form.querySelector(`input[name="${name}"]:checked`);
            if (selected) {
                formData[name] = selected.value;
            }
        });

        sessionStorage.setItem('iganze_form_draft', JSON.stringify(formData));
    }

    // Restore form data on load
    function restoreFormData() {
        const savedData = sessionStorage.getItem('iganze_form_draft');
        if (savedData) {
            try {
                const formData = JSON.parse(savedData);

                // Restore input values
                Object.keys(formData).forEach(key => {
                    const field = form.querySelector(`#${key}, [name="${key}"]`);
                    if (field && field.type !== 'radio') {
                        field.value = formData[key];
                    } else if (field && field.type === 'radio') {
                        const radio = form.querySelector(`input[name="${key}"][value="${formData[key]}"]`);
                        if (radio) radio.checked = true;
                    }
                });
            } catch (error) {
                console.error('Error restoring form data:', error);
            }
        }
    }

    // Auto-save every 30 seconds
    setInterval(autoSaveForm, 30000);

    // Save on input change
    inputs.forEach(input => {
        input.addEventListener('change', autoSaveForm);
    });

    // Restore data on page load
    window.addEventListener('load', restoreFormData);

    // Clear saved data on successful submission
    window.addEventListener('beforeunload', () => {
        if (!sessionStorage.getItem('formSubmitted')) {
            autoSaveForm();
        }
    });

    // Add smooth entrance animations
    window.addEventListener('load', () => {
        const formGroups = document.querySelectorAll('.fade-in');
        formGroups.forEach((group, index) => {
            setTimeout(() => {
                group.style.opacity = '1';
            }, index * 50);
        });
    });

    // Initialize Flatpickr for date fields
    if (typeof flatpickr !== 'undefined') {
        flatpickr("#dob", {
            dateFormat: "Y-m-d",
            disableMobile: "true",
            maxDate: "today"
        });

        flatpickr("#registrationDate", {
            dateFormat: "Y-m-d",
            disableMobile: "true"
        });
    }
    
}); // End DOMContentLoaded

