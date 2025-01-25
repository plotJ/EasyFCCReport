document.addEventListener('DOMContentLoaded', function() {
  // Populate state dropdown with full state names
  const states = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", 
    "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", 
    "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", 
    "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", 
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", 
    "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", 
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", 
    "Wisconsin", "Wyoming"
  ];
  
  const stateSelect = document.getElementById('state');
  states.forEach(state => {
    const option = document.createElement('option');
    option.value = state;
    option.textContent = state;
    stateSelect.appendChild(option);
  });

  // Load saved settings
  chrome.storage.sync.get({
    userInfo: {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      doNotCall: false,
      phoneType: 'residential_personal_phone_type_location',
      defaultComplaint: 'Unwanted AI/spam call. No prior business relationship. Asked to be removed from list. Did not cooperate in removing me from list.'
    }
  }, function(data) {
    document.getElementById('name').value = data.userInfo.name;
    document.getElementById('email').value = data.userInfo.email;
    document.getElementById('phone').value = data.userInfo.phone;
    document.getElementById('address').value = data.userInfo.address;
    document.getElementById('city').value = data.userInfo.city;
    document.getElementById('state').value = data.userInfo.state;
    document.getElementById('zip').value = data.userInfo.zip;
    document.getElementById('doNotCall').checked = data.userInfo.doNotCall;
    document.getElementById('phoneType').value = data.userInfo.phoneType;
    document.getElementById('defaultComplaint').value = data.userInfo.defaultComplaint;
  });

  document.getElementById('save').addEventListener('click', function() {
    const phone = document.getElementById('phone').value;
    if (!phone.match(/^\d{3}-\d{3}-\d{4}$/)) {
      alert('Please enter your phone number in XXX-XXX-XXXX format');
      return;
    }

    const userInfo = {
      name: document.getElementById('name').value,
      email: document.getElementById('email').value,
      phone: phone,
      address: document.getElementById('address').value,
      city: document.getElementById('city').value,
      state: document.getElementById('state').value,
      zip: document.getElementById('zip').value,
      doNotCall: document.getElementById('doNotCall').checked,
      phoneType: document.getElementById('phoneType').value,
      defaultComplaint: document.getElementById('defaultComplaint').value
    };

    console.log('Saving userInfo:', userInfo);  // Debug log

    chrome.storage.sync.set({ userInfo }, function() {
      console.log('Storage sync complete');  // Debug log
      const saveSuccess = document.getElementById('saveSuccess');
      saveSuccess.style.display = 'block';
      setTimeout(() => {
        saveSuccess.style.display = 'none';
      }, 3000);
    });
  });
});