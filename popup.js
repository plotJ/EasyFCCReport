document.addEventListener('DOMContentLoaded', function() {
  // Check for guide collapse state
  chrome.storage.sync.get(['guideCollapsed', 'userInfo', 'lastSubmission'], function(data) {
      // Handle guide collapse state
      if (data.guideCollapsed) {
          document.getElementById('guideContent').classList.add('collapsed');
          document.querySelector('.collapse-icon').textContent = '+';
      }

      const hasUserInfo = data.userInfo && data.userInfo.name;
      document.getElementById('firstTimeNotice').style.display = 
          hasUserInfo ? 'none' : 'block';
      
      // If there's a recent submission, pre-fill the number
      if (data.lastSubmission && Date.now() - data.lastSubmission.timestamp < 5000) {
          document.getElementById('spamNumber').value = data.lastSubmission.spamNumber;
          document.getElementById('callDetails').value = data.lastSubmission.callDetails;
      }
  });

  // Guide collapse functionality
  document.getElementById('guideHeader').addEventListener('click', function() {
      const content = document.getElementById('guideContent');
      const icon = this.querySelector('.collapse-icon');
      const isCollapsed = content.classList.toggle('collapsed');
      icon.textContent = isCollapsed ? '+' : '−';
      
      // Save collapse state
      chrome.storage.sync.set({ guideCollapsed: isCollapsed });
  });

  // Go to FCC button
  document.getElementById('goToFcc').addEventListener('click', function() {
      chrome.tabs.create({
          url: 'https://consumercomplaints.fcc.gov/hc/en-us/requests/new?ticket_form_id=39744'
      });
  });

  // Fill Complaint button
  document.getElementById('fillComplaint').addEventListener('click', async () => {
      const spamNumber = document.getElementById('spamNumber').value;
      if (!spamNumber.match(/^\d{3}-\d{3}-\d{4}$/)) {
          alert('Please enter the phone number in XXX-XXX-XXXX format');
          return;
      }
      
      const callDetails = document.getElementById('callDetails').value;

      // Save this submission
      chrome.storage.sync.set({
          lastSubmission: {
              spamNumber,
              callDetails,
              timestamp: Date.now(),
              autoSubmit: false
          }
      });

      try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          
          if (!tab.url.includes('consumercomplaints.fcc.gov')) {
              chrome.tabs.create({
                  url: 'https://consumercomplaints.fcc.gov/hc/en-us/requests/new?ticket_form_id=39744'
              }, function(newTab) {
                  chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                      if (tabId === newTab.id && info.status === 'complete') {
                          chrome.tabs.onUpdated.removeListener(listener);
                          setTimeout(() => {
                              executeFormFill(newTab.id, spamNumber, callDetails);
                          }, 2000);
                      }
                  });
              });
          } else {
              executeFormFill(tab.id, spamNumber, callDetails);
          }
      } catch (error) {
          console.error('Error:', error);
          alert('There was an error. Please try again.');
      }
  });

  document.getElementById('settings').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
  });
});

function executeFormFill(tabId, spamNumber, callDetails) {
  chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: fillFCCForm,
      args: [spamNumber, callDetails]
  });
}

function fillFCCForm(spamNumber, callDetails) {
  function getTodayString() {
      const today = new Date();
      return today.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric'
      });
  }

  function getCurrentTimeString() {
      const now = new Date();
      now.setMinutes(now.getMinutes() - 5);
      let hours = now.getHours();
      const ampm = hours >= 12 ? 'P.M.' : 'A.M.';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minutes = now.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes} ${ampm}`;
  }

  console.log('Starting to fill form...');
  
  chrome.storage.sync.get('userInfo', function(data) {
      const userInfo = data.userInfo;
      console.log('Got user info:', userInfo);

      // Basic info
      document.querySelector('input[name="request[anonymous_requester_email]"]').value = userInfo.email;
      document.querySelector('input[name="request[subject]"]').value = 'Unwanted Spam Call';
      // Description field
    document.querySelector('textarea[name="request[description]"]').value = 
        callDetails || userInfo.defaultComplaint || 'Unwanted AI/spam call. No prior business relationship. Asked to be removed from list. Did not cooperate in removing me from list.';

      // Phone Issues
      const phoneIssues = document.querySelector('input[name="request[custom_fields][22619354]"]');
      if (phoneIssues) {
          phoneIssues.value = 'telemarketing_phone';
          phoneIssues.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Give the form time to update after phone issues selection
      setTimeout(() => {
          // Phone Type/Location
          const phoneTypeLocation = document.querySelector('input[name="request[custom_fields][22659804]"]');
          if (phoneTypeLocation) {
              phoneTypeLocation.value = userInfo.phoneType;
              phoneTypeLocation.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // Telephone Number Where Call Received (user's number from settings)
          const receivedNumberField = document.querySelector('input[name="request[custom_fields][22625614]"]');
          if (receivedNumberField) {
              receivedNumberField.value = userInfo.phone;
              receivedNumberField.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // Date of Issue (use the actual datepicker input)
          const datePicker = document.querySelector('input.datepicker');
          if (datePicker) {
              const today = new Date();
              datePicker.click(); // Open the datepicker
              datePicker.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              datePicker.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // State (needs to handle full state name)
          const stateField = document.querySelector('input[name="request[custom_fields][22540114]"]');
          if (stateField) {
              stateField.value = 'california';  // lowercase for the form value
              stateField.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // Time
          document.querySelector('input[name="request[custom_fields][22732340]"]').value = getCurrentTimeString();

          // Sub-issue selection
          const subIssue = document.querySelector('input[name="request[custom_fields][360000167206]"]');
          if (subIssue) {
              subIssue.value = 'phone_unwanted_calls_all_other_unwanted_calls';
              subIssue.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // Type of Call - Prerecorded Voice
          const callType = document.querySelector('input[name="request[custom_fields][22787840]"]');
          if (callType) {
              callType.value = 'prerecorded_voice_type_of_call_telemarketing';
              callType.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // Advertiser's phone number
          document.querySelector('input[name="request[custom_fields][22659924]"]').value = spamNumber;

          // Advertise goods/services - Yes
          const advertiseGoods = document.querySelector('input[name="request[custom_fields][22625554]"]');
          if (advertiseGoods) {
              advertiseGoods.value = 'yes_telemarketing_services';
              advertiseGoods.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // Credit Card Debt
          const goodsType = document.querySelector('input[name="request[custom_fields][360046689972]"]');
          if (goodsType) {
              goodsType.value = 'credit_card_debt_services';
              goodsType.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // All "No" answers
          document.querySelector('input[name="request[custom_fields][22787930]"]').value = 'no_business_relationship_part_1';
          document.querySelector('input[name="request[custom_fields][22787940]"]').value = 'no_business_relationship_part_2';
          document.querySelector('input[name="request[custom_fields][22629554]"]').value = 'no_personal_relationship';

          // Do Not Call List status
          document.querySelector('input[name="request[custom_fields][22787860]"]').value = 
              userInfo.doNotCall ? 'yes_do_not_call_list' : 'no_do_not_call_list';

          // No permission to call
          document.querySelector('input[name="request[custom_fields][22625574]"]').value = 'no_permission_to_call';

          // Wireless phone
          document.querySelector('input[name="request[custom_fields][22781220]"]').value = 'wireless_phone';

          // Personal Information
          document.querySelector('input[name="request[custom_fields][22539594]"]').value = userInfo.name.split(' ')[0];
          document.querySelector('input[name="request[custom_fields][22704720]"]').value = userInfo.name.split(' ').slice(1).join(' ');
          document.querySelector('input[name="request[custom_fields][22554824]"]').value = userInfo.address;
          document.querySelector('input[name="request[custom_fields][22554844]"]').value = userInfo.city;
          // Personal Information
        document.querySelector('input[name="request[custom_fields][22540124]"]').value = userInfo.zip || '';
        console.log('Setting zip code to:', userInfo.zip);  // Debug log
          document.querySelector('input[name="request[custom_fields][22615094]"]').value = userInfo.phone;

          // Filing on behalf - No
          document.querySelector('input[name="request[custom_fields][22636844]"]').value = 'no_filing_on_behalf';

          // Check attestation
          const attestCheckbox = document.querySelector('input[name="request[custom_fields][22625624]"]');
          if (attestCheckbox) {
              attestCheckbox.checked = true;
              attestCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // Trigger change events on all filled fields
          document.querySelectorAll('input[name^="request[custom_fields]"]').forEach(input => {
              input.dispatchEvent(new Event('change', { bubbles: true }));
          });

          console.log('Form filled successfully');
      }, 1000);
  });
}