const chatPanel = document.getElementById('chatPanel');
const chatToggle = document.getElementById('chatToggle');
const chatCollapsedIcon = document.getElementById('chatCollapsedIcon');
const chatMessages = document.getElementById('chatMessages');
const chatEmptyState = document.getElementById('chatEmptyState');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const chatError = document.getElementById('chatError');

let chatHistory = []; // {role:'user'|'assistant', content:'...'}

function setChatCollapsed(collapsed){
  chatPanel.classList.toggle('collapsed', collapsed);
  chatToggle.textContent = collapsed ? '←' : '→';
  chatToggle.title = collapsed ? 'Expand' : 'Collapse';
}
chatToggle.addEventListener('click', () => setChatCollapsed(!chatPanel.classList.contains('collapsed')));
chatCollapsedIcon.addEventListener('click', () => setChatCollapsed(false));

chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 110) + 'px';
});
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    sendChatMessage();
  }
});
chatSend.addEventListener('click', sendChatMessage);

function currentModuleLabel(){
  const active = document.querySelector('.module-item.active span');
  return active ? active.textContent : 'Label Review';
}

function appendChatBubble(role, text){
  if (chatEmptyState) chatEmptyState.remove();
  const div = document.createElement('div');
  div.className = 'chat-msg ' + role;
  if (role === 'assistant'){
    div.innerHTML = text.split(/\n{2,}/).map(p => `<p>${escapeHtml(p).replace(/\n/g,'<br>')}</p>`).join('');
  } else {
    div.textContent = text;
  }
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

async function sendChatMessage(){
  const text = chatInput.value.trim();
  if (!text || chatSend.disabled) return;
  chatError.style.display = 'none';
  appendChatBubble('user', text);
  chatHistory.push({role:'user', content:text});
  chatInput.value = '';
  chatInput.style.height = 'auto';
  chatSend.disabled = true;

  const typingEl = document.createElement('div');
  typingEl.className = 'chat-typing';
  typingEl.innerHTML = '<span></span><span></span><span></span>';
  chatMessages.appendChild(typingEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try{
    const replyText = await RemiewAPI.chatReply(chatHistory, currentModuleLabel());
    typingEl.remove();
    appendChatBubble('assistant', replyText);
    chatHistory.push({role:'assistant', content:replyText});
  } catch(err){
    typingEl.remove();
    chatError.textContent = "Couldn't reach the assistant — try again.";
    chatError.style.display = 'block';
  } finally {
    chatSend.disabled = false;
  }
}
