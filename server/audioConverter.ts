import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execPromise = promisify(exec);

export async function convertWebMToWAV(webmBuffer: Buffer): Promise<Buffer> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-convert-'));
  const inputPath = path.join(tempDir, 'input.webm');
  const outputPath = path.join(tempDir, 'output.wav');
  
  try {
    console.log(`🔄 Converting WebM (${webmBuffer.length} bytes) to WAV...`);
    
    fs.writeFileSync(inputPath, webmBuffer);
    
    await execPromise(
      `ffmpeg -i "${inputPath}" -acodec pcm_s16le -ar 16000 -ac 1 "${outputPath}" 2>&1`
    );
    
    if (!fs.existsSync(outputPath)) {
      throw new Error("WAV conversion failed - output file not created");
    }
    
    const wavBuffer = fs.readFileSync(outputPath);
    console.log(`✅ Converted to WAV (${wavBuffer.length} bytes)`);
    
    return wavBuffer;
  } catch (error) {
    console.error("❌ Error converting audio:", error);
    throw new Error(`Audio conversion failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
  }
}
