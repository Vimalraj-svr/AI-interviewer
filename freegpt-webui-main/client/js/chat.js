const url_prefix = document.querySelector("body").getAttribute("data-urlprefix");
const message_box = document.getElementById(`messages`);
const numQuestions = document.getElementById(`numQuestions`);
const role = document.getElementById(`role`);
const loadingAnimation = document.querySelector('.loading-animation');
const userInput = document.querySelector('.user-input')
const animHead = document.querySelector('.anim-head')
const experience = document.getElementById(`experience`);
const techStack = document.getElementById(`techStack`);
const box_conversations = document.querySelector(`.top`);
const send_button = document.querySelector(`#send-button`);
const questionCardsContainer = document.getElementById('question-cards');
questionCardsContainer.innerHTML = '';

const textAreas = document.querySelectorAll('.custom-text-area');

textAreas.forEach((textArea) => {
    textArea.addEventListener('blur', () => {
        window.scrollTo(0, 0);
    });

    textArea.addEventListener('focus', () => {
        document.documentElement.scrollTop = document.documentElement.scrollHeight;
    });
});

const handle_ask = async () => {
	
	loadingAnimation.classList.remove('hide');
	animHead.classList.remove('hide')
	const numQuestions=document.getElementById('numQuestions').value
	const role=document.getElementById('role').value
	const experience=document.getElementById('experience').value
	const techStack=document.getElementById('techStack').value
	const format = `Sure! Here are the top 15 interview questions for a Full Stack Engineer role:

	1. **What is a Full Stack Developer?**
	   A Full Stack Developer is a professional with expertise in both front-end and back-end development. They possess knowledge of various technologies required to develop a complete web application.
	
	2. **Explain the components involved in the MERN stack.**
	   The MERN stack consists of MongoDB, Express.js, React.js, and Node.js. MongoDB is a NoSQL database, Express.js is used for building web applications, React.js is a JavaScript library for building user interfaces, and Node.js is a server-side JavaScript runtime environment.
	
	3. **What is the significance of React.js in front-end development?**
	   React.js is a popular JavaScript library used for building user interfaces. It provides a component-based architecture, which makes the development process more efficient. React.js also offers features like virtual DOM, one-way data binding, and reusability of components.`;
	
    const message = `Give top ${numQuestions} interview questions with answers for ${role} role for ${experience} years experienced candidate who should have proficient knowledge on ${techStack} with questions in bold and answers labelled with their consecutive numbers in the below format \n ${format}.`;

    if (message.length > 0) {
        document.getElementById('numQuestions').value = '';
        document.getElementById('role').value = '';
        document.getElementById('experience').value = '';
        document.getElementById('techStack').value = '';
        document.getElementById('numQuestions').dispatchEvent(new Event("input"));
        document.getElementById('role').dispatchEvent(new Event("input"));
        document.getElementById('experience').dispatchEvent(new Event("input"));
        document.getElementById('techStack').dispatchEvent(new Event("input"));
        await ask_gpt(message);
		
    }
};

const ask_gpt = async (message) => {
    try {
        add_conversation(window.conversation_id, message.substr(0, 16));
        window.scrollTo(0, 0);
        window.controller = new AbortController();
        window.text = ``;
        window.token = message_id();

        const response = await fetch(`${url_prefix}/backend-api/v2/conversation`, {
            method: `POST`,
            signal: window.controller.signal,
            headers: {
                "content-type": `application/json`,
                accept: `text/event-stream`,
            },
            body: JSON.stringify({
                conversation_id: window.conversation_id,
                action: `_ask`,
                model: "gpt-3.5-turbo",
                jailbreak: "default",
                meta: {
                    id: window.token,
                    content: {
                        conversation: await get_conversation(window.conversation_id),
                        internet_access: "true",
                        content_type: "text",
                        parts: [
                            {
                                content: message,
                                role: "user",
                            },
                        ],
                    },
                },
            }),
        });

        const reader = response.body.getReader();
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            chunk = decodeUnicode(new TextDecoder().decode(value));

            if (
                chunk.includes(`<form id="challenge-form" action="${url_prefix}/backend-api/v2/conversation?`)
            ) {
                chunk = `cloudflare token expired, please refresh the page.`;
            }

            text += chunk;
            window.scrollTo(0, 0);
        }
		console.log(text)
		send_button.classList.add('hide');
		loadingAnimation.classList.add('hide');
		animHead.classList.add('hide')
		document.getElementById('exit-button').style.display = 'block';
		const qaPairs = text.split(/\d+\.\s+\*\*(.*?)\*\*\s+/).filter(Boolean);

for (let i = 1; i < qaPairs.length; i += 2) {
    const question = qaPairs[i].trim();
    const answer = qaPairs[i + 1].trim();

    const card = document.createElement('div');
    card.classList.add('card');
    const cardHeader = document.createElement('div');
    cardHeader.classList.add('card-header');
    cardHeader.innerHTML = `<h3>Question: </h3>`;
    const cardBody = document.createElement('div');
    cardBody.classList.add('card-body');
    cardBody.innerHTML = `<p>${question}</p><p>${answer}</p>`;
    card.appendChild(cardHeader);
    card.appendChild(cardBody);
    questionCardsContainer.appendChild(card);
}
        if (text.includes(`instead. Maintaining this website and API costs a lot of money`)) {
            document.getElementById(`gpt_${window.token}`).innerHTML =
                "An error occurred, please reload / refresh cache and try again.";
        }

        add_message(window.conversation_id, "user", message);
        add_message(window.conversation_id, "assistant", text);

        prompt_lock = false;

        await load_conversations(20, 0);
        window.scrollTo(0, 0);
    } catch (e) {add_message(window.conversation_id, "user", message);

	prompt_lock = false;

	await load_conversations(20, 0);

	console.log(e);

	let cursorDiv = document.getElementById(`cursor`);
	if (cursorDiv) cursorDiv.parentNode.removeChild(cursorDiv);

	if (e.name != `AbortError`) {
		let error_message = `oops ! something went wrong, please try again / reload. [stacktrace in console]`;
		add_message(window.conversation_id, "assistant", error_message);
	} else {
		document.getElementById(`gpt_${window.token}`).innerHTML += ` [aborted]`;
		add_message(window.conversation_id, "assistant", text + ` [aborted]`);
	}
}
};

const decodeUnicode = (str) => {
	return str.replace(/\\u([a-fA-F0-9]{4})/g, function (match, grp) {
		return String.fromCharCode(parseInt(grp, 16));
	});
};

const new_conversation = async () => {
	history.pushState({}, null, `${url_prefix}/chat/`);
	window.conversation_id = uuid();
	await load_conversations(20, 0, true);
};

const load_conversation = async (conversation_id) => {
	let conversation = await JSON.parse(localStorage.getItem(`conversation:${conversation_id}`));

	for (item of conversation.items) {
		if (is_assistant(item.role)) {
			message_box.innerHTML += load_gpt_message_box(item.content);
		} else {
			message_box.innerHTML += load_user_message_box(item.content);
		}
	}

	document.querySelectorAll(`code`).forEach((el) => {
		hljs.highlightElement(el);
	});

	message_box.scrollTo({ top: message_box.scrollHeight, behavior: "smooth" });

	setTimeout(() => {
		message_box.scrollTop = message_box.scrollHeight;
	}, 500);
};

const load_user_message_box = (content) => {
	const messageDiv = createElement("div", { classNames: ["message"] });
	const avatarContainer = createElement("div", { classNames: ["avatar-container"], innerHTML: user_image });
	const contentDiv = createElement("div", { classNames: ["content"] });
	const preElement = document.createElement("pre");
	preElement.textContent = content;
	contentDiv.appendChild(preElement);

	messageDiv.append(avatarContainer, contentDiv);

	return messageDiv.outerHTML;
};

const load_gpt_message_box = (content) => {
	return `
            <div class="message">
                <div class="avatar-container">
                    ${gpt_image}
                </div>
                <div class="content">
                    ${markdown.render(content)}
                </div>
            </div>
        `;
};

const is_assistant = (role) => {
	return role == "assistant";
};

const get_conversation = async (conversation_id) => {
	let conversation = await JSON.parse(localStorage.getItem(`conversation:${conversation_id}`));
	return conversation.items;
};

const add_conversation = async (conversation_id, title) => {
	if (localStorage.getItem(`conversation:${conversation_id}`) == null) {
		localStorage.setItem(
			`conversation:${conversation_id}`,
			JSON.stringify({
				id: conversation_id,
				title: title,
				items: [],
			})
		);
	}
};

const add_message = async (conversation_id, role, content) => {
	before_adding = JSON.parse(localStorage.getItem(`conversation:${conversation_id}`));

	before_adding.items.push({
		role: role,
		content: content,
	});

	localStorage.setItem(`conversation:${conversation_id}`, JSON.stringify(before_adding)); 
};

const load_conversations = async (limit, offset, loader) => {
	let conversations = [];
	for (let i = 0; i < localStorage.length; i++) {
		if (localStorage.key(i).startsWith("conversation:")) {
			let conversation = localStorage.getItem(localStorage.key(i));
			conversations.push(JSON.parse(conversation));
		}
	}

	document.querySelectorAll(`code`).forEach((el) => {
		hljs.highlightElement(el);
	});
};

function h2a(str1) {
	var hex = str1.toString();
	var str = "";

	for (var n = 0; n < hex.length; n += 2) {
		str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
	}

	return str;
}

const uuid = () => {
	return `xxxxxxxx-xxxx-4xxx-yxxx-${Date.now().toString(16)}`.replace(/[xy]/g, function (c) {
		var r = (Math.random() * 16) | 0,
			v = c == "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
};

const message_id = () => {
	random_bytes = (Math.floor(Math.random() * 1338377565) + 2956589730).toString(2);
	unix = Math.floor(Date.now() / 1000).toString(2);

	return BigInt(`0b${unix}${random_bytes}`).toString();
};

window.onload = async () => {
	conversations = 0;
	for (let i = 0; i < localStorage.length; i++) {
		if (localStorage.key(i).startsWith("conversation:")) {
			conversations += 1;
		}
	}

	if (conversations == 0) localStorage.clear();

	await setTimeout(() => {
		load_conversations(20, 0);
	}, 1);

	if (!window.location.href.endsWith(`#`)) {
		if (/\/chat\/.+/.test(window.location.href.slice(url_prefix.length))) {
			await load_conversation(window.conversation_id);
		}
	}

	const textAreas = ["numQuestions", "role", "experience", "techStack"];

	send_button.addEventListener('click', async (event) => {
		event.preventDefault();
		new_conversation();
		userInput.classList.add('hide');
		document.getElementById('send-button').style.display = 'none';
		loadingAnimation.classList.remove('hide');
		animHead.classList.remove('hide');
		numQuestions.blur();
		role.blur();
		experience.blur();
		techStack.blur();
		await handle_ask();
		document.getElementById('exit-button').classList.remove('hide');
	});

	document.getElementById('exit-button').addEventListener('click', () => {
		document.getElementById('question-cards').innerHTML = '';
		userInput.classList.remove('hide');
		document.getElementById('send-button').style.display = 'block';
		document.getElementById('exit-button').style.display = 'none';})
}