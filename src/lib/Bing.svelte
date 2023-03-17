const sendRequestBing = async (messages: Message[]): Promise<Response> => {
    const conversation = await (
      await fetch("https://www.bing.com/turing/conversation/create", {
        credentials: "include",
      })
    ).json();

    return await new Promise((resolve, reject) => {
      const text = messages[messages.length - 1].content;
      const invocationId = "0";

      const terminalChar = "";

      const result = {
        author: "bot",
        id: crypto.randomUUID(),
        conversationId: conversation.conversationId,
        clientId: conversation.clientId,
        conversationSignature: conversation.conversationSignature,
        invocationId: `${parseInt(invocationId, 10) + 1}`,
        text: "",
        detail: "",
        conversationExpiryTime: null,
      };

      const ws = new WebSocket("wss://sydney.bing.com/sydney/ChatHub");
      ws.onopen = () => {
        ws.send(`{"protocol":"json","version":1}${terminalChar}`);
      };

      ws.onmessage = (event) => {
        const objects = event.data.toString().split(terminalChar);
        const messages = objects
          .map((object) => {
            try {
              return JSON.parse(object);
            } catch (_) {
              return object;
            }
          })
          .filter(Boolean);

        if (!messages.length) {
          return;
        }

        // Initial message
        if (messages.length === 1 && Object.keys(messages[0]).length === 0) {
          ws.send(`{"type":6}${terminalChar}`);

          const params = {
            arguments: [
              {
                source: "cib",
                optionsSets: [
                  "nlu_direct_response_filter",
                  "deepleo",
                  "disable_emoji_spoken_text",
                  "responsible_ai_policy_235",
                  "enablemm",
                  "harmonyv3",
                  "h3ads",
                  "wlthrottle",
                  "cpcttl7d",
                  "blocklistv2",
                  "h3toppfp2",
                  "dv3sugg",
                ],
                allowedMessageTypes: [
                  "Chat",
                  "InternalSearchQuery",
                  "InternalSearchResult",
                  "Disengaged",
                  "InternalLoaderMessage",
                  "RenderCardRequest",
                  "AdsQuery",
                  "SemanticSerp",
                  "GenerateContentQuery",
                  "SearchQuery",
                ],
                sliceIds: [
                  "perfsvgopt",
                  "228h3ads",
                  "h3ads",
                  "0310wlthrot",
                  "307retryscs0",
                  "307retryscs0",
                  "cache0307",
                  "ssoverlap50",
                  "ssplon",
                  "sssreduce",
                  "sswebtop2",
                  "302blocklist",
                  "308disbings0",
                  "311h3toppfp2",
                ],
                isStartOfSession: true,
                message: {
                  locale: "en-US",
                  market: "en-US",
                  region: "US",
                  author: "user",
                  inputMethod: "Keyboard",
                  text,
                },
                conversationSignature: conversation.conversationSignature,
                participant: {
                  id: conversation.clientId,
                },
                conversationId: conversation.conversationId,
              },
            ],
            invocationId,
            target: "chat",
            type: 4,
          };

          ws.send(`${JSON.stringify(params)}${terminalChar}`);

          return;
        }

        for (const message of messages) {
          if (message.type === 1) {
            // Message in progress
            const msg = message.arguments[0].messages[0];

            if (!msg.messageType) {
              result.author = msg.author;
              result.text = msg.text;
              result.detail = msg;

              // Write to stdout
              console.log(`\r${result.text}`);
            }
          } else if (message.type === 2) {
            // Message complete
            if (message.item.result.error) {
              throw new Error(`Error message: ${message.item.result.error}`);
            }

            const validMessages = message.item.messages?.filter((m) => !m.messageType);
            const lastMessage = validMessages?.[validMessages?.length - 1];

            if (lastMessage) {
              result.conversationId = message.item.conversationId;
              result.conversationExpiryTime = message.item.conversationExpiryTime;

              result.author = lastMessage.author;
              result.text = lastMessage.text;
              result.detail = lastMessage;

              //resolve(result);
            }
          } else if (message.type === 3) {
            // Conversation complete
            const response: Response = {
              id: result.id,
              object: "response",
              created: 1,
              choices: [
                {
                  index: 0,
                  message: {
                    role: "assistant",
                    content: result.text,
                  },
                  finish_reason: "stop",
                },
              ],
              usage: null,
              error: null,
            };
            resolve(response);

            ws.close();
            return;
          } else {
            // TODO: handle other message types
            // these may be for displaying "adaptive cards"
            console.warn("Unexpected message type", message.type, message);
          }
        }
      };

      ws.onerror = (error) => {
        console.log("WebSocket error:", error);
        reject(error);
      };

      ws.onclose = (_event) => {
        console.log("WebSocket closed");
      };
    });
  };