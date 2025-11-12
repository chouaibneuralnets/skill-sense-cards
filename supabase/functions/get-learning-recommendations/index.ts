/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import {
  GoogleGenerativeAI,
} from "https://esm.sh/@google/generative-ai@0.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LearningRecommendation {
  skill: string;
  course_title: string;
  course_link: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { missingSkills } = await req.json();
    
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');

    if (!GOOGLE_API_KEY) {
      console.error('ERROR: GOOGLE_API_KEY is not configured in environment!');
      return new Response(
        JSON.stringify({ error: 'Configuration error: API Key missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
    });

    console.log('Generating learning recommendations...');

    const skillsList = missingSkills.map((s: any) => s.name).join(', ');
    
    const prompt = `
      For each of the following missing skills: ${skillsList}
      
      Suggest a credible online course from platforms like Coursera, edX, Udemy, LinkedIn Learning, or other recognized providers.
      
      Your response MUST be ONLY a JSON object with a single key "recommendations".
      The value of "recommendations" must be an array. Return nothing else but this JSON object.
      
      Use this exact format for each recommendation:
      {
        "skill": "Name of the skill",
        "course_title": "Title of the Suggested Course",
        "course_link": "Complete URL of a credible online course on this topic (ex: https://www.coursera.org/learn/...)"
      }
      
      IMPORTANT: Provide real, working URLs to actual courses that exist on these platforms.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let jsonText = response.text();
    
    // Clean up the response (remove markdown code blocks if present)
    const startIndex = jsonText.indexOf('{');
    const endIndex = jsonText.lastIndexOf('}');

    if (startIndex !== -1 && endIndex !== -1) {
      jsonText = jsonText.substring(startIndex, endIndex + 1);
    }
    
    const parsedResult = JSON.parse(jsonText);
    const recommendations: LearningRecommendation[] = parsedResult.recommendations || [];

    console.log(`Generated ${recommendations.length} learning recommendations`);

    return new Response(
      JSON.stringify({ recommendations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-learning-recommendations function:', error);
    return new Response(
      JSON.stringify({ 
        error: "Error generating recommendations", 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
