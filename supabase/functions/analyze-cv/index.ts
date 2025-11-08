/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Skill {
  name: string;
  confidence: number;
  evidence: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cvText } = await req.json();
    
    if (!cvText || cvText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'CV text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing CV with AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert CV analyzer. Extract skills from the provided CV and rate them with a confidence score (0-100). For each skill, provide a short quote from the CV as evidence. Return exactly 5-10 most relevant skills.'
          },
          {
            role: 'user',
            content: `Analyze this CV and extract the main skills:\n\n${cvText}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_skills',
              description: 'Extract skills from a CV with confidence scores and evidence',
              parameters: {
                type: 'object',
                properties: {
                  skills: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { 
                          type: 'string',
                          description: 'Name of the skill'
                        },
                        confidence: { 
                          type: 'number',
                          description: 'Confidence score from 0 to 100'
                        },
                        evidence: { 
                          type: 'string',
                          description: 'Short quote from the CV as proof (max 100 characters)'
                        }
                      },
                      required: ['name', 'confidence', 'evidence'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['skills'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_skills' } }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI response received');
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      console.error('No tool call in response');
      return new Response(
        JSON.stringify({ error: 'Invalid AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    const skills: Skill[] = result.skills || [];
    
    console.log(`Extracted ${skills.length} skills`);

    return new Response(
      JSON.stringify({ skills }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-cv function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
