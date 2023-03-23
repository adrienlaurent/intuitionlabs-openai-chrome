import * as InboxSDK from '@inboxsdk/core';

const disabledBtn = (disabled = true) => {
  try {
    document.querySelector('.inboxsdk__modal_buttons')
      .childNodes
      .forEach((input) => {
        input.disabled = disabled
      })
  } catch (e) {

  }
}

InboxSDK.load(2, "sdk_OpenAI_a19ee5a9fd")
  .then((sdk) => {
    sdk.Compose.registerComposeViewHandler((composeView) => {
      composeView.addButton({
        title: "Write this better",
        iconUrl: 'https://image.ibb.co/mXS2ZU/images.png',
        iconClass: "cursor-pointer",
        onClick: function (event) {
          createModal(composeView, sdk.Widgets)
        },
      });

    });
  });

const generateText = async (inputText) => {
  try {
    const {
      data: {
        choices
      }
    } = await executeOpenAi({
      model: "text-davinci-003",
      prompt: "Regenerate this email in a better way:" + inputText.replaceAll('<br>', '\n'),
      temperature: 0,
      max_tokens: 500,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    })

    if (choices && choices.length) {
      return choices[0].text || "No suggestions"
    }

    return inputText.replaceAll('\n', '<br>');
  } catch (e) {
    console.log(e);
    return inputText
  }
}

const executeOpenAi = (body) => {
  return new Promise(function (resolve, reject) {
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + String("YOUR_API_KEY")
      },
      body: JSON.stringify(body)
    };
    fetch('https://api.openai.com/v1/completions', requestOptions)
      .then(response => response.json())
      .then(data => {
        resolve({
          data
        })
      })
      .catch(err => {
        reject(err)
      });
  })
}

const createModal = (composeView, Widgets) => {
  if (!composeView.getHTMLContent().length) {
    return
  }

  const parser = new DOMParser();
  const htmlDoc = parser.parseFromString(composeView.getHTMLContent(), 'text/html');

  const gmailQoute = htmlDoc.querySelector('.gmail_quote');
  if (gmailQoute) {
    gmailQoute.remove();
  }

  const newContent = htmlDoc.querySelector('body').innerHTML

  const el = document.createElement('div');
  el.innerHTML = `<div id="open-ai-div">
    <div id="open-ai-text">Loading...</div>
  </div>`;

  generateText(newContent)
    .then(response => {
      document.getElementById("open-ai-text").innerText = response
      disabledBtn(false)
    })

  Widgets.showModalView({
    title: 'Open AI',
    el,
    chrome: true,
    buttons: [{
        text: "Accept",
        onClick: (e) => {
          const text = document.getElementById("open-ai-text").innerHTML
          if (!["Loading...", "No suggestions"].includes(text)) {
            // console.log({
            //   oldhtml: composeView.getHTMLContent()
            // });
            composeView.setBodyHTML(text);
          }
          e.modalView.close()
        },
        type: "PRIMARY_ACTION",
        title: "Accept the text"
      },
      {
        text: "Regenerate",
        onClick: (e) => {
          const text = document.getElementById("open-ai-text").innerText;

          document.getElementById("open-ai-text").innerText = "Loading..."

          disabledBtn()

          generateText(text)
            .then(response => {
              document.getElementById("open-ai-text").innerText = response
              disabledBtn(false)
            })
        },
        type: "SECONDARY_ACTION",
        title: "Regenerate the text"
      },
    ]
  });

  disabledBtn()
}
