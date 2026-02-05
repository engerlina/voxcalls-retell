import { useState } from "react";

const flowNodes = [
  {
    id: "welcome",
    label: "Welcome & Language Detection",
    type: "conversation",
    color: "#4F46E5",
    x: 400,
    y: 40,
    description:
      "Greet the caller. Ask if they'd like to speak in English or Mandarin. Default to English if no preference stated. Note: Cantonese (zh-HK) is NOT supported by Retell - only zh-CN (Mandarin) is available.",
  },
  {
    id: "english_flow",
    label: "English Agent",
    type: "agent_swap",
    color: "#059669",
    x: 150,
    y: 160,
    description:
      "Agent Swap to English-speaking Lily agent (language: en-AU) with full conversation history.",
  },
  {
    id: "mandarin_flow",
    label: "Mandarin Agent",
    type: "agent_swap",
    color: "#DC2626",
    x: 400,
    y: 160,
    description:
      "Agent Swap to Mandarin-configured Lily agent (language: zh-CN). Same logic, Mandarin voice & language.",
  },
  {
    id: "identify_intent",
    label: "Identify Intent",
    type: "conversation",
    color: "#4F46E5",
    x: 150,
    y: 290,
    description:
      "Ask how you can help. Detect intent: book appointment, ask a question about services/hours/pricing, or emergency.",
  },
  {
    id: "emergency",
    label: "Emergency Escalation",
    type: "transfer_call",
    color: "#DC2626",
    x: 650,
    y: 290,
    description:
      "Immediately provide emergency number 0402 012 082 and offer to transfer the call directly.",
  },
  {
    id: "clinic_info",
    label: "Clinic Q&A",
    type: "conversation",
    color: "#7C3AED",
    x: 450,
    y: 400,
    description:
      "Answer questions about services, dentist info, locations (Chatswood & CBD), hours, pricing, payment options (HICAPS, payment plans). Use Knowledge Base.",
  },
  {
    id: "collect_name",
    label: "Collect Name",
    type: "conversation",
    color: "#4F46E5",
    x: 80,
    y: 400,
    description: "Ask for the patient's name. One question at a time.",
  },
  {
    id: "collect_type",
    label: "Appointment Type",
    type: "conversation",
    color: "#4F46E5",
    x: 80,
    y: 500,
    description:
      "Ask appointment type: consultation, clean, emergency toothache, or other. If consultation/other, ask purpose.",
  },
  {
    id: "collect_dentist",
    label: "Preferred Dentist",
    type: "conversation",
    color: "#4F46E5",
    x: 80,
    y: 600,
    description:
      "Ask if they have a preferred dentist or happy to see anyone. For cleans, offer Ms Cathy first. Validate against team list. Check Dr Kenny (CBD only) / Dr Adrian (Chatswood only, except renovation period).",
  },
  {
    id: "renovation_check",
    label: "Renovation Period Check",
    type: "branch",
    color: "#F59E0B",
    x: 350,
    y: 600,
    description:
      "If date falls 16 Feb - 23 Mar 2026: Chatswood closed. Only Sussex St (CBD) available. Dr Adrian available in city Wed + Thu during this period.",
  },
  {
    id: "collect_datetime",
    label: "Preferred Date/Time",
    type: "conversation",
    color: "#4F46E5",
    x: 80,
    y: 710,
    description:
      "Collect preferred date/time or criteria (e.g. 'Monday afternoons'). Assume within 3 months. If too far out, take message for now.",
  },
  {
    id: "book_appointment",
    label: "Submit Booking",
    type: "function",
    color: "#059669",
    x: 80,
    y: 820,
    description:
      "Call book_appointment function. Tell caller the clinic will contact to confirm. Recap details ONCE only.",
  },
  {
    id: "offer_sms",
    label: "Offer SMS Confirmation",
    type: "conversation",
    color: "#4F46E5",
    x: 80,
    y: 920,
    description:
      "Offer to send SMS with booking details, address, and doctor info.",
  },
  {
    id: "send_sms",
    label: "Send SMS",
    type: "function",
    color: "#059669",
    x: 300,
    y: 920,
    description:
      "Call send_sms function with booking confirmation, clinic contact details, and directions if requested.",
  },
  {
    id: "anything_else",
    label: "Anything Else?",
    type: "conversation",
    color: "#7C3AED",
    x: 400,
    y: 1030,
    description:
      "Check if they need help with anything else before ending the call.",
  },
  {
    id: "end_call",
    label: "End Call",
    type: "end",
    color: "#6B7280",
    x: 400,
    y: 1130,
    description: "Thank the caller warmly and end the conversation.",
  },
];

const edges = [
  { from: "welcome", to: "english_flow", label: "English" },
  { from: "welcome", to: "mandarin_flow", label: "Mandarin" },
  { from: "english_flow", to: "identify_intent", label: "" },
  { from: "mandarin_flow", to: "identify_intent", label: "" },
  { from: "identify_intent", to: "collect_name", label: "Book" },
  { from: "identify_intent", to: "clinic_info", label: "Question" },
  { from: "identify_intent", to: "emergency", label: "Emergency" },
  { from: "clinic_info", to: "anything_else", label: "Answered" },
  { from: "collect_name", to: "collect_type", label: "" },
  { from: "collect_type", to: "collect_dentist", label: "" },
  { from: "collect_dentist", to: "renovation_check", label: "Date in range?" },
  { from: "renovation_check", to: "collect_datetime", label: "" },
  { from: "collect_datetime", to: "book_appointment", label: "" },
  { from: "book_appointment", to: "offer_sms", label: "" },
  { from: "offer_sms", to: "send_sms", label: "Yes" },
  { from: "offer_sms", to: "anything_else", label: "No" },
  { from: "send_sms", to: "anything_else", label: "" },
  { from: "anything_else", to: "end_call", label: "No" },
  { from: "anything_else", to: "identify_intent", label: "Yes" },
  { from: "emergency", to: "end_call", label: "" },
];

const nodeTypeLabels = {
  conversation: "Conversation",
  agent_swap: "Agent Swap",
  transfer_call: "Transfer Call",
  function: "Function",
  branch: "Branch",
  end: "End",
};

const nodeTypeIcons = {
  conversation: "#",
  agent_swap: "⇄",
  function: "⚙",
  transfer_call: "☎",
  branch: "⑂",
  end: "□",
};

const tabs = ["Flow Design", "API Code", "Node Details"];

const apiCode = `import Retell from 'retell-sdk';

const client = new Retell({
  apiKey: process.env.RETELL_API_KEY,
});

// -----------------------------------------------
// IMPORTANT: Retell Supported Languages
// -----------------------------------------------
// Mandarin: zh-CN ✅ Supported
// Cantonese: zh-HK ❌ NOT SUPPORTED by Retell
//
// Only English and Mandarin routing is possible.
// For Cantonese speakers, you would need to:
// 1. Use a Mandarin agent (some mutual intelligibility)
// 2. Or use a human transfer for Cantonese calls
// -----------------------------------------------

// STEP 1: Create language-specific agents first
// You need 2 agents: English and Mandarin
// Each has the same conversation flow but different
// voice/language settings.

// STEP 2: Create the main routing conversation flow
// This is the "front door" agent that detects language
// and transfers to the appropriate agent.

const routingFlow = await client.conversationFlow.create({
  model_choice: { model: 'gpt-5', type: 'cascading' },
  start_speaker: 'agent',
  global_prompt: \`You are Lily, a friendly and efficient AI receptionist
for Lok Dentists, a family-owned dental practice with locations
in Chatswood and Sydney CBD. You speak English and Mandarin.
Your goal right now is to identify which language the caller
prefers. Be warm but brief.

Note: If caller requests Cantonese, apologize that we don't
have Cantonese support yet and offer English or Mandarin.\`,
  nodes: [
    {
      id: 'welcome',
      type: 'conversation',
      instruction: {
        type: 'prompt',
        text: \`Greet the caller warmly: "Hello, thank you for calling
Lok Dentists. This is Lily speaking. Would you prefer to
continue in English or Mandarin? 您好，请问您想用英文还是普通话继续？"

If the caller responds in Mandarin, detect it and transition
accordingly. If they speak English or don't specify, continue
in English.

If they request Cantonese, say: "I'm sorry, we don't have
Cantonese support available yet. Would English or Mandarin
work for you?"\`
      },
      edges: [
        {
          id: 'edge_to_english',
          destination_node_id: 'swap_english',
          transition_condition: {
            type: 'prompt',
            prompt: 'Caller wants English or speaks English or does not specify a language preference'
          }
        },
        {
          id: 'edge_to_mandarin',
          destination_node_id: 'swap_mandarin',
          transition_condition: {
            type: 'prompt',
            prompt: 'Caller requests Mandarin or responds in Mandarin (普通话/中文)'
          }
        }
      ]
    },
    {
      id: 'swap_english',
      type: 'agent_swap',
      agent_id: 'YOUR_ENGLISH_AGENT_ID',  // Replace with actual agent ID
      post_call_analysis_setting: {
        type: 'default'  // Use default post-call analysis
      },
      edge: {
        destination_node_id: 'swap_failed',
        transition_condition: {
          type: 'prompt',
          prompt: 'Agent swap failed'
        }
      }
    },
    {
      id: 'swap_mandarin',
      type: 'agent_swap',
      agent_id: 'YOUR_MANDARIN_AGENT_ID',  // Replace with actual agent ID
      post_call_analysis_setting: {
        type: 'default'
      },
      edge: {
        destination_node_id: 'swap_failed',
        transition_condition: {
          type: 'prompt',
          prompt: 'Agent swap failed'
        }
      }
    },
    {
      id: 'swap_failed',
      type: 'conversation',
      instruction: {
        type: 'prompt',
        text: 'Apologize that we are experiencing technical difficulties and ask them to call back or leave a message.'
      },
      edges: [
        {
          id: 'edge_to_end',
          destination_node_id: 'end_call',
          transition_condition: {
            type: 'prompt',
            prompt: 'Always transition to end after apologizing'
          }
        }
      ]
    },
    {
      id: 'end_call',
      type: 'end',
      instruction: {
        type: 'prompt',
        text: 'End the call politely.'
      }
    }
  ],
  start_node_id: 'welcome',
});

console.log('Routing flow created:', routingFlow.conversation_flow_id);


// -----------------------------------------------
// STEP 3: Create the English agent's conversation flow
// (Repeat with translated prompts for Mandarin)
// -----------------------------------------------

const englishFlow = await client.conversationFlow.create({
  model_choice: { model: 'gpt-5', type: 'cascading' },
  start_speaker: 'agent',
  global_prompt: \`You are Lily, a friendly and efficient AI assistant for
Lok Dentists, a family-owned dental practice with locations in
Chatswood and Sydney CBD.

KEY RULES:
- Ask ONE question at a time during booking
- Do NOT repeat booking details until the final summary
- Be warm, professional, and concise
- Do not elaborate unless asked
- Team members: Dr Kenny, Dr Adrian, Dr Joyce, Dr Calvin, Dr Daena, Ms Cathy
- Dr Kenny is only available in the city (Sussex St CBD)
- Dr Adrian is only available in Chatswood
- EXCEPTION: 16 Feb - 23 Mar 2026, Chatswood is closed for renovation.
  Only Sussex St (CBD) is available. Dr Adrian available in city Wed + Thu.
- For cleans, offer Ms Cathy first
- Appointments must be within 3 months. If further out, take a message.
- Emergency number: 0402 012 082\`,

  tools: [
    {
      type: 'custom',
      name: 'book_appointment',
      description: 'Submit a booking request with patient details',
      url: 'https://your-n8n-webhook.com/book-appointment',
      method: 'POST',
      parameters: {
        type: 'object',
        properties: {
          patient_name: { type: 'string', description: 'Patient full name' },
          phone_number: { type: 'string', description: 'Patient phone number' },
          appointment_type: { type: 'string', description: 'Type: consultation, clean, emergency, other' },
          preferred_dentist: { type: 'string', description: 'Preferred dentist or "any"' },
          preferred_datetime: { type: 'string', description: 'Preferred date/time or criteria' },
          location: { type: 'string', description: 'Chatswood or CBD' },
          notes: { type: 'string', description: 'Any additional notes' }
        },
        required: ['patient_name', 'appointment_type', 'preferred_datetime']
      }
    },
    {
      type: 'custom',
      name: 'send_sms',
      description: 'Send SMS confirmation to patient',
      url: 'https://your-n8n-webhook.com/send-sms',
      method: 'POST',
      parameters: {
        type: 'object',
        properties: {
          phone_number: { type: 'string' },
          message: { type: 'string' }
        },
        required: ['phone_number', 'message']
      }
    }
  ],

  nodes: [
    {
      id: 'identify_intent',
      type: 'conversation',
      instruction: {
        type: 'prompt',
        text: \`The caller has been transferred from the language routing
agent. You already have the conversation history.

Say: "How can I help you today?"

Identify their intent:
- Booking an appointment
- Asking about services, hours, pricing, locations, or dentists
- Dental emergency\`
      },
      edges: [
        {
          id: 'edge_to_booking',
          destination_node_id: 'collect_name',
          transition_condition: {
            type: 'prompt',
            prompt: 'Caller wants to book or schedule an appointment'
          }
        },
        {
          id: 'edge_to_info',
          destination_node_id: 'clinic_info',
          transition_condition: {
            type: 'prompt',
            prompt: 'Caller has a question about services, hours, pricing, locations, or team'
          }
        },
        {
          id: 'edge_to_emergency',
          destination_node_id: 'emergency',
          transition_condition: {
            type: 'prompt',
            prompt: 'Caller has a dental emergency or is in severe pain'
          }
        }
      ]
    },

    {
      id: 'clinic_info',
      type: 'conversation',
      instruction: {
        type: 'prompt',
        text: \`Answer the caller's question about Lok Dentists using the
knowledge base. Be concise and helpful. After answering, check
if they need anything else.\`
      },
      edges: [
        {
          id: 'edge_info_to_anything',
          destination_node_id: 'anything_else',
          transition_condition: {
            type: 'prompt',
            prompt: 'Question has been answered'
          }
        }
      ]
    },

    {
      id: 'emergency',
      type: 'conversation',
      instruction: {
        type: 'prompt',
        text: \`This is a dental emergency. Say: "For dental emergencies,
please call our emergency line directly at 0402 012 082.
Would you like me to transfer you now?"\`
      },
      edges: [
        {
          id: 'edge_emergency_transfer',
          destination_node_id: 'emergency_transfer',
          transition_condition: {
            type: 'prompt',
            prompt: 'Caller wants to be transferred'
          }
        },
        {
          id: 'edge_emergency_end',
          destination_node_id: 'end_call',
          transition_condition: {
            type: 'prompt',
            prompt: 'Caller does not want to be transferred or will call themselves'
          }
        }
      ]
    },

    {
      id: 'emergency_transfer',
      type: 'transfer_call',
      transfer_destination: {
        number: '+61402012082'
      },
      transfer_option: {
        prompt: 'Transferring you to our emergency line now.',
        should_resume: false
      },
      edge: {
        destination_node_id: 'end_call',
        transition_condition: {
          type: 'prompt',
          prompt: 'Transfer failed or completed'
        }
      }
    },

    {
      id: 'collect_name',
      type: 'conversation',
      instruction: {
        type: 'prompt',
        text: 'Ask: "Can I get your name please?"'
      },
      edges: [
        {
          id: 'edge_name_to_type',
          destination_node_id: 'collect_type',
          transition_condition: {
            type: 'prompt',
            prompt: 'Caller has provided their name'
          }
        }
      ]
    },

    {
      id: 'collect_type',
      type: 'conversation',
      instruction: {
        type: 'prompt',
        text: \`Ask what type of appointment they need:
- Consultation
- Clean
- Emergency toothache
- Other

If they say consultation or other, ask briefly what
it's regarding so we can note it for the dentist.\`
      },
      edges: [
        {
          id: 'edge_type_to_dentist',
          destination_node_id: 'collect_dentist',
          transition_condition: {
            type: 'prompt',
            prompt: 'Appointment type has been identified'
          }
        }
      ]
    },

    {
      id: 'collect_dentist',
      type: 'conversation',
      instruction: {
        type: 'prompt',
        text: \`Ask if they have a preferred dentist or are happy to
see anyone available.

RULES:
- If it's a CLEAN, offer Ms Cathy first: "For cleans, we
  have Ms Cathy available. Would you like to see her, or
  do you have a preference?"
- Only accept team members: Dr Kenny, Dr Adrian, Dr Joyce,
  Dr Calvin, Dr Daena, Ms Cathy
- If they name someone not on the team, say: "I don't have
  that name in our team. Our dentists include Dr Kenny,
  Dr Adrian, Dr Joyce, Dr Calvin, Dr Daena, and Ms Cathy."
- If Dr Kenny: let them know he's only available at the
  city (Sussex St) location
- If Dr Adrian: let them know he's only available in
  Chatswood (except during renovation period 16 Feb - 23
  Mar 2026 when he's in the city Wed + Thu)\`
      },
      edges: [
        {
          id: 'edge_dentist_to_datetime',
          destination_node_id: 'collect_datetime',
          transition_condition: {
            type: 'prompt',
            prompt: 'Dentist preference has been noted'
          }
        }
      ]
    },

    {
      id: 'collect_datetime',
      type: 'conversation',
      instruction: {
        type: 'prompt',
        text: \`Ask for their preferred date and time. This can be a
specific date or general criteria like "Monday afternoons"
or "any weekday morning".

RULES:
- Assume appointment is within the next 3 months from today
- If they request a date too far out, say: "That's a bit
  far out. I'll take a note of your preference and we'll
  book it closer to the date."
- If date falls between 16 Feb - 23 Mar 2026: inform them
  that Chatswood is closed for renovation and only Sussex
  Street (CBD) is available during that period.
- Collect their phone number for the booking.\`
      },
      edges: [
        {
          id: 'edge_datetime_to_book',
          destination_node_id: 'submit_booking',
          transition_condition: {
            type: 'prompt',
            prompt: 'Date/time preference and phone number collected'
          }
        }
      ]
    },

    {
      id: 'submit_booking',
      type: 'conversation',
      instruction: {
        type: 'prompt',
        text: \`Recap the booking details ONCE:
- Name, appointment type, dentist, preferred time, location

Then say: "I've recorded your appointment preference. You'll
receive a call back during business hours to confirm the
booking time."

Then ask: "Would you like me to send you an SMS confirmation
with the details?"\`
      },
      // The book_appointment function is called here
      edges: [
        {
          id: 'edge_book_sms_yes',
          destination_node_id: 'send_sms_node',
          transition_condition: {
            type: 'prompt',
            prompt: 'Caller wants SMS confirmation'
          }
        },
        {
          id: 'edge_book_sms_no',
          destination_node_id: 'anything_else',
          transition_condition: {
            type: 'prompt',
            prompt: 'Caller does not want SMS or has declined'
          }
        }
      ]
    },

    {
      id: 'send_sms_node',
      type: 'conversation',
      instruction: {
        type: 'prompt',
        text: \`Send the SMS confirmation using the send_sms function
with the booking details, clinic address, and dentist name.
Confirm to the caller that the SMS has been sent.\`
      },
      edges: [
        {
          id: 'edge_sms_to_anything',
          destination_node_id: 'anything_else',
          transition_condition: {
            type: 'prompt',
            prompt: 'SMS has been sent and confirmed'
          }
        }
      ]
    },

    {
      id: 'anything_else',
      type: 'conversation',
      instruction: {
        type: 'prompt',
        text: 'Ask: "Is there anything else I can help you with?"'
      },
      edges: [
        {
          id: 'edge_more_help',
          destination_node_id: 'identify_intent',
          transition_condition: {
            type: 'prompt',
            prompt: 'Caller needs more help or has another question'
          }
        },
        {
          id: 'edge_end',
          destination_node_id: 'end_call',
          transition_condition: {
            type: 'prompt',
            prompt: 'Caller is done and does not need more help'
          }
        }
      ]
    },

    {
      id: 'end_call',
      type: 'end',
      instruction: {
        type: 'prompt',
        text: \`Say: "Thank you for calling Lok Dentists. Have a
wonderful day!" End the call warmly.\`
      }
    }
  ],
  start_node_id: 'identify_intent',
});

console.log('English flow created:', englishFlow.conversation_flow_id);


// -----------------------------------------------
// STEP 4: Create the English Agent
// -----------------------------------------------

const englishAgent = await client.agent.create({
  response_engine: {
    type: 'retell-conversation-flow',
    conversation_flow_id: englishFlow.conversation_flow_id
  },
  agent_name: 'Lok Dentists - English (Lily)',
  voice_id: '11labs-Lily',  // Replace with your preferred voice
  voice_model: 'eleven_multilingual_v2',
  language: 'en-AU',  // Australian English
  responsiveness: 0.8,
  enable_backchannel: true,
  backchannel_words: ['yeah', 'uh-huh', 'mm-hmm'],
});

console.log('English agent created:', englishAgent.agent_id);


// -----------------------------------------------
// STEP 5: Create the Mandarin Agent
// (Same flow, different language/voice)
// -----------------------------------------------

// First create the Mandarin flow (same structure, translated prompts)
const mandarinFlow = await client.conversationFlow.create({
  model_choice: { model: 'gpt-5', type: 'cascading' },
  start_speaker: 'agent',
  global_prompt: \`你是Lily，Lok牙科诊所的友好高效的AI接待员。
诊所在Chatswood和悉尼CBD都有分店。

关键规则：
- 预约时一次只问一个问题
- 在最后总结前不要重复预约详情
- 热情、专业、简洁
- 团队成员：Dr Kenny, Dr Adrian, Dr Joyce, Dr Calvin, Dr Daena, Ms Cathy
- Dr Kenny 只在市区（Sussex St CBD）
- Dr Adrian 只在Chatswood（装修期间例外）
- 例外：2026年2月16日至3月23日，Chatswood关闭装修。
  只有Sussex St（CBD）营业。Dr Adrian在此期间周三周四在市区。
- 洗牙优先安排Ms Cathy
- 预约必须在3个月内。如果更远，记录信息。
- 紧急电话：0402 012 082\`,
  // ... same node structure as englishFlow but with Chinese prompts
  nodes: [
    // Mandarin versions of all nodes
    // (abbreviated for space - same structure)
  ],
  start_node_id: 'identify_intent',
});

const mandarinAgent = await client.agent.create({
  response_engine: {
    type: 'retell-conversation-flow',
    conversation_flow_id: mandarinFlow.conversation_flow_id
  },
  agent_name: 'Lok Dentists - Mandarin (Lily)',
  voice_id: '11labs-Charlotte',  // Use a voice that supports Chinese
  voice_model: 'eleven_multilingual_v2',  // Multilingual model required
  language: 'zh-CN',  // Mandarin Chinese
  responsiveness: 0.8,
  enable_backchannel: true,
  backchannel_words: ['嗯', '好的', '是的'],
});

console.log('Mandarin agent created:', mandarinAgent.agent_id);


// -----------------------------------------------
// STEP 6: Create the Language Router Agent
// -----------------------------------------------

// Update the routing flow with actual agent IDs
const finalRoutingFlow = await client.conversationFlow.update(
  routingFlow.conversation_flow_id,
  {
    nodes: [
      // ... update swap_english.agent_id to englishAgent.agent_id
      // ... update swap_mandarin.agent_id to mandarinAgent.agent_id
    ]
  }
);

const routerAgent = await client.agent.create({
  response_engine: {
    type: 'retell-conversation-flow',
    conversation_flow_id: routingFlow.conversation_flow_id
  },
  agent_name: 'Lok Dentists - Language Router',
  voice_id: '11labs-Lily',
  voice_model: 'eleven_multilingual_v2',  // Multilingual for greeting
  language: 'multi',  // Enable multilingual detection
  responsiveness: 0.9,
});

console.log('Router agent created:', routerAgent.agent_id);
console.log('Assign this agent to your phone number.');`;

function FlowDiagram({ onSelectNode, selectedId }) {
  const width = 820;
  const height = 1200;

  return (
    <div
      style={{
        overflow: "auto",
        maxHeight: "70vh",
        border: "1px solid #1e293b",
        borderRadius: 12,
        background: "#0f172a",
      }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#475569" />
          </marker>
        </defs>

        {edges.map((e, i) => {
          const from = flowNodes.find((n) => n.id === e.from);
          const to = flowNodes.find((n) => n.id === e.to);
          if (!from || !to) return null;
          const x1 = from.x + 75;
          const y1 = from.y + 40;
          const x2 = to.x + 75;
          const y2 = to.y + 5;
          const midY = (y1 + y2) / 2;
          return (
            <g key={i}>
              <path
                d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                fill="none"
                stroke="#334155"
                strokeWidth="1.5"
                markerEnd="url(#arrowhead)"
              />
              {e.label && (
                <text
                  x={(x1 + x2) / 2}
                  y={midY - 4}
                  fill="#94a3b8"
                  fontSize="9"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {e.label}
                </text>
              )}
            </g>
          );
        })}

        {flowNodes.map((node) => {
          const isSelected = selectedId === node.id;
          return (
            <g
              key={node.id}
              onClick={() => onSelectNode(node.id)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={node.x}
                y={node.y}
                width={150}
                height={44}
                rx={8}
                fill={isSelected ? node.color : "#1e293b"}
                stroke={node.color}
                strokeWidth={isSelected ? 2.5 : 1.5}
                opacity={isSelected ? 1 : 0.9}
              />
              <text
                x={node.x + 12}
                y={node.y + 16}
                fill={node.color}
                fontSize="8"
                fontFamily="monospace"
                fontWeight="600"
                letterSpacing="0.5"
                opacity={0.8}
              >
                {nodeTypeIcons[node.type]}{" "}
                {nodeTypeLabels[node.type]?.toUpperCase()}
              </text>
              <text
                x={node.x + 12}
                y={node.y + 32}
                fill={isSelected ? "#fff" : "#e2e8f0"}
                fontSize="10.5"
                fontFamily="system-ui, sans-serif"
                fontWeight="500"
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState("welcome");

  const selectedNode = flowNodes.find((n) => n.id === selectedNodeId);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0f1c",
        color: "#e2e8f0",
        fontFamily:
          "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#f8fafc",
              margin: 0,
              letterSpacing: "-0.5px",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Lok Dentists - Retell Conversation Flow
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#64748b",
              margin: "6px 0 0",
            }}
          >
            Language routing via Agent Swap (English/Mandarin) + full booking flow
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 2,
            marginBottom: 20,
            background: "#1e293b",
            borderRadius: 10,
            padding: 3,
          }}
        >
          {tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              style={{
                flex: 1,
                padding: "10px 16px",
                background: activeTab === i ? "#334155" : "transparent",
                color: activeTab === i ? "#f8fafc" : "#64748b",
                border: "none",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "system-ui, sans-serif",
                transition: "all 0.15s",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 0 && (
          <div>
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
              {Object.entries(nodeTypeLabels).map(([type, label]) => {
                const node = flowNodes.find((n) => n.type === type);
                return (
                  <div
                    key={type}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 11,
                      color: "#94a3b8",
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 3,
                        background: node?.color || "#475569",
                      }}
                    />
                    {label}
                  </div>
                );
              })}
            </div>
            <FlowDiagram
              onSelectNode={setSelectedNodeId}
              selectedId={selectedNodeId}
            />
            {selectedNode && (
              <div
                style={{
                  marginTop: 16,
                  padding: 16,
                  background: "#1e293b",
                  borderRadius: 10,
                  borderLeft: `3px solid ${selectedNode.color}`,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: selectedNode.color,
                    fontWeight: 600,
                    letterSpacing: "0.5px",
                    marginBottom: 4,
                  }}
                >
                  {nodeTypeLabels[selectedNode.type]?.toUpperCase()}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#f8fafc",
                    marginBottom: 8,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {selectedNode.label}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "#94a3b8",
                    lineHeight: 1.6,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {selectedNode.description}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 1 && (
          <div
            style={{
              background: "#1e293b",
              borderRadius: 12,
              padding: 20,
              overflow: "auto",
              maxHeight: "75vh",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <span
                style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}
              >
                retell-conversation-flow.js
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "#059669",
                  background: "#064e3b",
                  padding: "3px 8px",
                  borderRadius: 4,
                }}
              >
                retell-sdk
              </span>
            </div>
            <pre
              style={{
                fontSize: 11.5,
                lineHeight: 1.65,
                color: "#cbd5e1",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
              }}
            >
              {apiCode}
            </pre>
          </div>
        )}

        {activeTab === 2 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxHeight: "75vh",
              overflow: "auto",
            }}
          >
            {flowNodes.map((node) => (
              <div
                key={node.id}
                style={{
                  padding: 14,
                  background:
                    selectedNodeId === node.id ? "#1e293b" : "#131b2e",
                  borderRadius: 10,
                  borderLeft: `3px solid ${node.color}`,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onClick={() => {
                  setSelectedNodeId(node.id);
                  setActiveTab(0);
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#f8fafc",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {node.label}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: node.color,
                      background: `${node.color}15`,
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontWeight: 600,
                    }}
                  >
                    {nodeTypeLabels[node.type]}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#94a3b8",
                    lineHeight: 1.5,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {node.description}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#475569",
                    marginTop: 6,
                    fontFamily: "monospace",
                  }}
                >
                  id: {node.id}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
