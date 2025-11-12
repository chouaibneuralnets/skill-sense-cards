/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "https://esm.sh/@google/generative-ai@0.21.0";

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
    const { cvText, githubUsername } = await req.json();
    
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');

    if (!GOOGLE_API_KEY) {
      console.error('ERROR: GOOGLE_API_KEY is not configured in environment!');
      return new Response(
        JSON.stringify({ error: 'Configuration error: API Key missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let finalText = cvText || '';

    // If GitHub username is provided, fetch and merge GitHub data
    if (githubUsername) {
      console.log(`Fetching GitHub data for username: ${githubUsername}`);
      
      try {
        const headers: HeadersInit = {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'SkillSense-App'
        };
        
        if (GITHUB_TOKEN) {
          headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
        }

        // Fetch user profile
        const userResponse = await fetch(`https://api.github.com/users/${githubUsername}`, { headers });
        
        if (!userResponse.ok) {
          console.error(`GitHub API error: ${userResponse.status}`);
          return new Response(
            JSON.stringify({ error: `GitHub user not found: ${githubUsername}` }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const userData = await userResponse.json();
        
        // Fetch repositories
        const reposResponse = await fetch(`https://api.github.com/users/${githubUsername}/repos?sort=updated&per_page=10`, { headers });
        const reposData = await reposResponse.json();

        // Build GitHub profile text
        let githubText = `\n\n=== GITHUB PROFILE ===\n`;
        githubText += `Username: ${userData.login}\n`;
        if (userData.name) githubText += `Name: ${userData.name}\n`;
        if (userData.bio) githubText += `Bio: ${userData.bio}\n`;
        if (userData.company) githubText += `Company: ${userData.company}\n`;
        if (userData.location) githubText += `Location: ${userData.location}\n`;
        githubText += `Public Repos: ${userData.public_repos}\n`;
        githubText += `Followers: ${userData.followers}\n`;
        
        if (Array.isArray(reposData) && reposData.length > 0) {
          githubText += `\nRecent Repositories:\n`;
          reposData.forEach((repo: any) => {
            githubText += `- ${repo.name}: ${repo.description || 'No description'}\n`;
            if (repo.language) githubText += `  Language: ${repo.language}\n`;
            if (repo.topics && repo.topics.length > 0) {
              githubText += `  Topics: ${repo.topics.join(', ')}\n`;
            }
          });
        }

        githubText += `=== END GITHUB PROFILE ===\n`;
        
        // Merge with CV text
        finalText = cvText ? `${cvText}${githubText}` : githubText;
        
        console.log('Successfully merged GitHub data with CV text');
      } catch (githubError) {
        console.error('Error fetching GitHub data:', githubError);
        // Continue with just CV text if GitHub fetch fails
        if (!cvText) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch GitHub data and no CV text provided' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    if (!finalText.trim()) {
      return new Response(
        JSON.stringify({ error: 'No content to analyze (provide CV text or GitHub username)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
    });

    console.log('Analyzing merged content with Gemini 2.5 Flash Lite...');

    const prompt = `
      You are an expert in technical recruitment and HR. Analyze the following merged text (which may contain CV content and/or GitHub profile information).
      Extract all technical and non-technical skills.
      
      Your response must be *only* a JSON object with a single key "skills".
      The value of "skills" must be an array. Return nothing else but this JSON object.
      
      For each skill, use this exact format:
      {
        "name": "Skill name",
        "confidence": 100,
        "evidence": "An exact quote from the text (max 15 words)"
      }
      (replace 100 with a confidence score from 1 to 100)
      
      Pay attention to skills mentioned in both CV and GitHub profile - these should have higher confidence scores.
    `;

    const result = await model.generateContent(`${prompt}\n\nMERGED CONTENT:\n${finalText}`);
    const response = await result.response;
    let jsonText = response.text();
    
    // --- DEBUT DU BLOC DE NETTOYAGE ---
    // L'IA peut renvoyer ```json\n{...}\n```
    // Nous extrayons le JSON pur en trouvant la première accolade { et la dernière }
    const startIndex = jsonText.indexOf('{');
    const endIndex = jsonText.lastIndexOf('}');

    if (startIndex !== -1 && endIndex !== -1) {
      jsonText = jsonText.substring(startIndex, endIndex + 1);
    }
    // --- FIN DU BLOC DE NETTOYAGE ---
    
    const parsedResult = JSON.parse(jsonText);
    const skills: Skill[] = parsedResult.skills || [];

    console.log(`Extraction de ${skills.length} compétences`);

    return new Response(
      JSON.stringify({ skills }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur détaillée dans la fonction d\'analyse:', error);
    return new Response(
      JSON.stringify({ 
        error: "Erreur d'analyse IA", 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
