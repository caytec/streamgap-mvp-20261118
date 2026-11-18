(function () {
  "use strict";

  var DEFAULT_API_URL = "https://streamgap-api.vercel.app/api/generate";
  var API_URL = typeof window.API_URL === "string" && window.API_URL.trim()
    ? window.API_URL.trim()
    : DEFAULT_API_URL;
  var APP_URL = "https://caytec.github.io/streamgap-mvp-20261118/";
  var form = document.getElementById("generator-form");
  var button = document.getElementById("generate");
  var status = document.getElementById("status");
  var result = document.getElementById("result");
  var cards = document.getElementById("cards");
  var latest = null;
  var busy = false;

  function readInput() {
    return {
      game: document.getElementById("game").value.trim(),
      downtime: document.getElementById("downtime").value,
      duration: Number(document.getElementById("duration").value),
      tone: document.getElementById("tone").value,
      topic: document.getElementById("topic").value.trim()
    };
  }

  function validOutput(item, input) {
    return item &&
      typeof item.opening === "string" &&
      item.opening.length <= 500 &&
      Array.isArray(item.prompts) &&
      item.prompts.length === 3 &&
      item.prompts.every(function (value) {
        return typeof value === "string" && value.length <= 300;
      }) &&
      item.poll &&
      typeof item.poll.question === "string" &&
      item.poll.question.length <= 300 &&
      Array.isArray(item.poll.options) &&
      item.poll.options.length >= 2 &&
      item.poll.options.length <= 4 &&
      item.poll.options.every(function (value) {
        return typeof value === "string" && value.length <= 100;
      }) &&
      item.mini_game &&
      typeof item.mini_game.name === "string" &&
      item.mini_game.name.length <= 100 &&
      typeof item.mini_game.rules === "string" &&
      item.mini_game.rules.length <= 500 &&
      Number.isFinite(item.mini_game.duration_seconds) &&
      item.mini_game.duration_seconds >= 0 &&
      item.mini_game.duration_seconds <= input.duration &&
      typeof item.transition_back === "string" &&
      item.transition_back.length <= 500 &&
      typeof item.chat_command_copy === "string" &&
      item.chat_command_copy.length <= 500 &&
      typeof item.safety_note === "string" &&
      item.safety_note.length <= 500;
  }

  function fallback(input) {
    var subject = input.topic || input.game;
    var tone = input.tone.toLowerCase();
    var opening = "While we have a " + input.downtime.toLowerCase() + ", let’s turn " + subject + " into a quick chat moment.";

    if (tone === "hype") {
      opening = "Gap time, chat! Let’s make this " + subject + " moment count.";
    }

    if (tone === "cozy") {
      opening = "Let’s settle in for a tiny " + subject + " chat while we wait.";
    }

    if (tone === "funny") {
      opening = "The loading screen has requested a group project, chat.";
    }

    return {
      opening: opening,
      prompts: [
        "What is the most underrated part of " + input.game + " right now?",
        "What should I try, avoid, or explain when we return?",
        "Give this gap a one-word mood and defend it."
      ],
      poll: {
        question: "What should shape the next segment?",
        options: ["A risky play", "A safe play", "A chat story", "A wild card"]
      },
      mini_game: {
        name: "Three-Word Forecast",
        rules: "Chat predicts what happens next using exactly three words. Read a few predictions when the game returns.",
        duration_seconds: Math.min(input.duration, 60)
      },
      transition_back: "The gap is over. Prediction locked—let’s get back to " + input.game + " and see who was right.",
      chat_command_copy: "!poll What should shape the next segment? | A risky play | A safe play | A chat story | A wild card",
      safety_note: "Keep participation optional, avoid personal information, and skip any suggestion that could put someone at risk."
    };
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    var copied = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (!copied) {
      throw new Error("Copy failed");
    }
  }

  async function requestOutput(input) {
    if (!API_URL) {
      throw new Error("API disabled");
    }

    var response = await fetch(API_URL, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error("API request failed");
    }

    var data = await response.json();

    if (!validOutput(data, input)) {
      throw new Error("Invalid output");
    }

    return data;
  }

  function textFor(label, value) {
    return label + "\n" + value;
  }

  function render(item, input) {
    var sections = [
      ["Opening line", item.opening],
      ["Audience prompts", item.prompts.map(function (prompt, index) {
        return (index + 1) + ". " + prompt;
      }).join("\n")],
      ["Poll", item.poll.question + "\n" + item.poll.options.map(function (option) {
        return "• " + option;
      }).join("\n")],
      ["Mini-game: " + item.mini_game.name, item.mini_game.rules + "\nApprox. " + item.mini_game.duration_seconds + " seconds"],
      ["Return transition", item.transition_back],
      ["Chatbot-ready text", item.chat_command_copy],
      ["Safety note", item.safety_note]
    ];

    cards.textContent = "";

    sections.forEach(function (section, index) {
      var article = document.createElement("article");
      article.className = "output-card" + (index === 1 || index === 2 ? " wide" : "");

      var heading = document.createElement("h3");
      heading.textContent = section[0];

      var paragraph = document.createElement("p");
      paragraph.textContent = section[1];

      var copy = document.createElement("button");
      copy.className = "copy";
      copy.type = "button";
      copy.textContent = "Copy";
      copy.setAttribute("aria-label", "Copy " + section[0]);

      copy.addEventListener("click", async function () {
        try {
          await copyText(textFor(section[0], section[1]));
          copy.textContent = "Copied";
          status.textContent = section[0] + " copied.";
        } catch (error) {
          status.textContent = "Copy failed. Select the text manually.";
        }

        window.setTimeout(function () {
          copy.textContent = "Copy";
        }, 1200);
      });

      article.appendChild(heading);
      article.appendChild(paragraph);
      article.appendChild(copy);
      cards.appendChild(article);
    });

    latest = {
      item: item,
      input: input
    };

    result.hidden = false;
    result.focus({preventScroll: true});

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    result.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start"
    });
  }

  function allText() {
    return [
      "StreamGap segment",
      "",
      "Opening: " + latest.item.opening,
      "",
      "Prompts:",
      "- " + latest.item.prompts.join("\n- "),
      "",
      "Poll: " + latest.item.poll.question,
      latest.item.poll.options.join(" / "),
      "",
      "Mini-game: " + latest.item.mini_game.name,
      latest.item.mini_game.rules,
      "",
      "Transition: " + latest.item.transition_back,
      "",
      "Chat: " + latest.item.chat_command_copy,
      "",
      "Safety: " + latest.item.safety_note
    ].join("\n");
  }

  function escapeXml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function wrapSvgText(value, maxCharacters) {
    var words = String(value).split(/\s+/);
    var lines = [];
    var line = "";

    words.forEach(function (word) {
      var candidate = line ? line + " " + word : word;

      if (candidate.length > maxCharacters && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });

    if (line) {
      lines.push(line);
    }

    return lines.slice(0, 6);
  }

  function svgLines(lines, x, y, lineHeight, attributes) {
    return lines.map(function (line, index) {
      return "<text x=\"" + x + "\" y=\"" + (y + index * lineHeight) + "\" " + attributes + ">" + escapeXml(line) + "</text>";
    }).join("");
  }

  function cardSvg() {
    var questionLines = wrapSvgText(latest.item.poll.question,  thirtyFive());
    var footer = escapeXml(APP_URL);

    return [
      "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1080\" height=\"1080\" viewBox=\"0 0 1080 1080\">",
      "<rect width=\"1080\" height=\"1080\" fill=\"#172033\"/>",
      "<circle cx=\"920\" cy=\"100\" r=\"260\" fill=\"#6c4df6\"/>",
      "<text x=\"80\" y=\"115\" fill=\"#fff\" font-family=\"Arial,sans-serif\" font-size=\"44\" font-weight=\"700\">StreamGap</text>",
      "<text x=\"80\" y=\"240\" fill=\"#9fe8d8\" font-family=\"Arial,sans-serif\" font-size=\"28\" font-weight=\"700\">CHAT DECIDED</text>",
      svgLines(questionLines, 80, 340, 72, "fill=\"#fff\" font-family=\"Arial,sans-serif\" font-size=\"58\" font-weight=\"700\""),
      "<text x=\"80\" y=\"820\" fill=\"#dce2ef\" font-family=\"Arial,sans-serif\" font-size=\"28\">Keep the conversation going while we wait.</text>",
      "<text x=\"80\" y=\"980\" fill=\"#9aa7bd\" font-family=\"Arial,sans-serif\" font-size=\"22\">" + footer + "</text>",
      "</svg>"
    ].join("");
  }

  function thirtyFive() {
    return 35;
  }

  async function generate() {
    if (busy) {
      return;
    }

    busy = true;
    button.disabled = true;
    button.textContent = "Generating…";
    status.setAttribute("aria-busy", "true");
    status.textContent = "Building a useful gap segment.";

    var input = readInput();

    if (!input.game) {
      status.textContent = "Enter a game or category first.";
      button.disabled = false;
      button.textContent = "Generate my segment";
      status.setAttribute("aria-busy", "false");
      busy = false;
      document.getElementById("game").focus();
      return;
    }

    var local = fallback(input);
    render(local, input);

    try {
      var remote = await requestOutput(input);
      render(remote, input);
      status.textContent = "Segment ready.";
    } catch (error) {
      status.textContent = "The API was unavailable. A curated fallback is ready.";
    } finally {
      busy = false;
      button.disabled = false;
      button.textContent = "Generate my segment";
      status.setAttribute("aria-busy", "false");
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    generate();
  });

  document.getElementById("copy-all").addEventListener("click", async function () {
    if (!latest) {
      return;
    }

    try {
      await copyText(allText());
      status.textContent = "All sections copied.";
    } catch (error) {
      status.textContent = "Copy failed. Select the text manually.";
    }
  });

  document.getElementById("download").addEventListener("click", function () {
    if (!latest) {
      return;
    }

    var blob = new Blob([cardSvg()], {type: "image/svg+xml;charset=utf-8"});
    var objectUrl = URL.createObjectURL(blob);
    var link = document.createElement("a");

    link.href = objectUrl;
    link.download = "streamgap-card.svg";
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(function () {
      URL.revokeObjectURL(objectUrl);
    }, 1000);

    status.textContent = "Card download started.";
  });

  document.getElementById("share").addEventListener("click", async function () {
    if (!latest) {
      return;
    }

    var data = {
      title: "StreamGap segment",
      text: latest.item.poll.question,
      url: APP_URL
    };
    var canShare = window.isSecureContext && typeof navigator.share === "function";

    try {
      if (canShare) {
        await navigator.share(data);
        status.textContent = "Share sheet opened.";
      } else {
        await copyText(APP_URL);
        status.textContent = "Share URL copied.";
      }
    } catch (error) {
      if (error && error.name === "AbortError") {
        return;
      }

      status.textContent = "Sharing failed. Copy the URL manually.";
    }
  });

  document.getElementById("another").addEventListener("click", function () {
    generate();
  });

  document.getElementById("not-useful").addEventListener("click", function () {
    status.textContent = "Thanks—we’ll use this as a reminder to improve the generator.";
  });
}());
