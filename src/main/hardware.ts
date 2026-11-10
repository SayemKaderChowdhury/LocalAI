import { execSync } from 'child_process';
import os from 'os';
import { HardwareSpecs, ModelTierItem } from '../shared/types';
import { logger } from './logger';

let cachedHardwareSpecs: HardwareSpecs | null = null;

export function setCachedHardwareSpecs(specs: HardwareSpecs): void {
  cachedHardwareSpecs = specs;
}

export function getHardwareSpecs(forceRefresh: boolean = false): HardwareSpecs {
  if (cachedHardwareSpecs && !forceRefresh) {
    return cachedHardwareSpecs;
  }

  let cpu = os.cpus()[0]?.model || 'Unknown CPU';
  let cpuCores = os.cpus().length || 4;
  let totalRamGB = Math.round((os.totalmem() / 1024 / 1024 / 1024) * 10) / 10;
  let freeRamGB = Math.round((os.freemem() / 1024 / 1024 / 1024) * 10) / 10;
  let gpuName = 'Integrated Graphics';
  let vramGB = 0;
  let diskFreeGB = 100;
  let diskTotalGB = 500;
  let isNvmeOrSsd = true;
  let windowsVersion = 'Windows 11 / 10';

  try {
    const psScript = `
      $cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1).Name;
      $cores = (Get-CimInstance Win32_Processor | Select-Object -First 1).NumberOfCores;
      $ram = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1);
      $freeRam = [math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB, 1);
      $gpu = Get-CimInstance Win32_VideoController | Select-Object -First 1 Name, AdapterRAM;
      $cDrive = Get-PSDrive C;
      $diskFree = [math]::Round($cDrive.Free / 1GB, 1);
      $diskTotal = [math]::Round(($cDrive.Used + $cDrive.Free) / 1GB, 1);
      $isSsd = $false;
      try {
        $disk = Get-PhysicalDisk | Select-Object -First 1 MediaType, BusType;
        if ($disk.MediaType -match 'SSD' -or $disk.BusType -match 'NVMe') { $isSsd = $true }
      } catch {}
      $os = (Get-CimInstance Win32_OperatingSystem).Caption;
      
      [PSCustomObject]@{
        cpu = $cpu;
        cores = $cores;
        totalRam = $ram;
        freeRam = $freeRam;
        gpuName = $gpu.Name;
        vramGB = [math]::Round($gpu.AdapterRAM / 1GB, 1);
        diskFree = $diskFree;
        diskTotal = $diskTotal;
        isSsd = $isSsd;
        os = $os;
      } | ConvertTo-Json -Compress
    `;

    const raw = execSync(`powershell.exe -NoProfile -NonInteractive -Command "${psScript.replace(/\n/g, ' ')}"`, {
      encoding: 'utf-8',
      timeout: 8000,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const parsed = JSON.parse(raw);
    if (parsed.cpu) cpu = parsed.cpu;
    if (parsed.cores) cpuCores = parsed.cores;
    if (parsed.totalRam) totalRamGB = parsed.totalRam;
    if (parsed.freeRam) freeRamGB = parsed.freeRam;
    if (parsed.gpuName) gpuName = parsed.gpuName;
    if (parsed.vramGB !== undefined) vramGB = Math.max(0, parsed.vramGB);
    if (parsed.diskFree) diskFreeGB = parsed.diskFree;
    if (parsed.diskTotal) diskTotalGB = parsed.diskTotal;
    if (parsed.isSsd !== undefined) isNvmeOrSsd = parsed.isSsd;
    if (parsed.os) windowsVersion = parsed.os;
  } catch (err) {
    logger.warn('PowerShell hardware detection fallback to Node os info:', err);
  }

  // Model tier determination
  let tier: HardwareSpecs['tier'] = '16gb_mid';
  let recommendedModel = 'qwen3.5:4b';
  let upgradeModel = 'qwen3:8b';
  let visionModel = 'qwen3.5:4b';

  if (totalRamGB <= 9 && vramGB < 4) {
    tier = '8gb_low';
    recommendedModel = 'qwen3:1.7b';
    upgradeModel = 'qwen3:4b';
    visionModel = 'gemma3:4b';
  } else if (totalRamGB <= 20 && vramGB < 12) {
    tier = '16gb_mid';
    recommendedModel = 'qwen3.5:4b';
    upgradeModel = 'qwen3:8b';
    visionModel = 'qwen3.5:4b';
  } else if (totalRamGB >= 30 || vramGB >= 16) {
    tier = totalRamGB >= 60 || vramGB >= 24 ? 'ultra' : '32gb_high';
    recommendedModel = 'qwen3:14b';
    upgradeModel = 'qwen3:32b';
    visionModel = 'qwen3.5:9b';
  }

  const result: HardwareSpecs = {
    cpu,
    cpuCores,
    totalRamGB,
    freeRamGB,
    gpuName,
    vramGB,
    diskFreeGB,
    diskTotalGB,
    isNvmeOrSsd,
    windowsVersion,
    tier,
    recommendedModel,
    upgradeModel,
    visionModel,
  };

  cachedHardwareSpecs = result;
  return result;
}

export const KNOWN_MODELS: ModelTierItem[] = [
  {
    id: 'qwen3:1.7b',
    name: 'Qwen 3 1.7B',
    tag: 'qwen3:1.7b',
    sizeGB: 1.4,
    ramNeededGB: 3.5,
    expectedSpeed: '45-65 tok/s',
    tier: '8 GB RAM / Entry',
    description: 'Ultra-fast, lightweight model ideal for low RAM or background tasks. Apache-2.0.',
    isVision: false,
    isExperimental: false,
  },
  {
    id: 'qwen3:4b',
    name: 'Qwen 3 4B',
    tag: 'qwen3:4b',
    sizeGB: 2.5,
    ramNeededGB: 6.0,
    expectedSpeed: '25-40 tok/s',
    tier: '16 GB RAM / Fast Text',
    description: 'Sweet spot of reasoning, coding, and fast dense text inference. Apache-2.0.',
    isVision: false,
    isExperimental: false,
  },
  {
    id: 'qwen3.5:4b',
    name: 'Qwen 3.5 4B Vision',
    tag: 'qwen3.5:4b',
    sizeGB: 3.3,
    ramNeededGB: 7.0,
    expectedSpeed: '20-35 tok/s',
    tier: '16 GB RAM / Recommended Default (Vision)',
    description: 'Full image perception, chart analysis, OCR, and reasoning. Multimodal.',
    isVision: true,
    isExperimental: false,
  },
  {
    id: 'qwen3:8b',
    name: 'Qwen 3 8B',
    tag: 'qwen3:8b',
    sizeGB: 5.2,
    ramNeededGB: 10.5,
    expectedSpeed: '15-25 tok/s',
    tier: '16 GB+ RAM / High Performance',
    description: 'High-precision logic, complex coding, and structured output upgrade.',
    isVision: false,
    isExperimental: false,
  },
  {
    id: 'qwen3.5:9b',
    name: 'Qwen 3.5 9B Vision',
    tag: 'qwen3.5:9b',
    sizeGB: 6.5,
    ramNeededGB: 12.0,
    expectedSpeed: '12-20 tok/s',
    tier: '16-32 GB RAM / High Vision',
    description: 'State of the art multimodal vision and reasoning for strong hardware.',
    isVision: true,
    isExperimental: false,
  },
  {
    id: 'qwen3:14b',
    name: 'Qwen 3 14B',
    tag: 'qwen3:14b',
    sizeGB: 9.3,
    ramNeededGB: 16.0,
    expectedSpeed: '10-18 tok/s',
    tier: '32 GB RAM / Heavyweight',
    description: 'Exceptional reasoning depth for complex math, analysis, and architecture.',
    isVision: false,
    isExperimental: false,
  },
  {
    id: 'mistral-small:24b',
    name: 'Mistral Small 24B',
    tag: 'mistral-small:24b',
    sizeGB: 14.2,
    ramNeededGB: 22.0,
    expectedSpeed: '6-12 tok/s',
    tier: '32 GB+ RAM / Studio',
    description: 'Advanced multilingual and enterprise reasoning. Apache-2.0.',
    isVision: false,
    isExperimental: false,
  },
  {
    id: 'qwen3:32b',
    name: 'Qwen 3 32B',
    tag: 'qwen3:32b',
    sizeGB: 20.1,
    ramNeededGB: 28.0,
    expectedSpeed: '4-8 tok/s',
    tier: '32-64 GB RAM / Frontier Local',
    description: 'Top-tier frontier intelligence running entirely locally.',
    isVision: false,
    isExperimental: false,
  },
  {
    id: 'gemma3:4b',
    name: 'Gemma 3 4B Vision',
    tag: 'gemma3:4b',
    sizeGB: 3.1,
    ramNeededGB: 6.5,
    expectedSpeed: '22-38 tok/s',
    tier: '16 GB RAM / Vision Alternative',
    description: 'Google Gemma 3 with built-in vision and 128K context window.',
    isVision: true,
    isExperimental: false,
  },
  // --- Opt-In Uncensored / Abliterated Models ---
  {
    id: 'dolphin3:8b',
    name: 'Dolphin 3 8B (Uncensored)',
    tag: 'dolphin3:8b',
    sizeGB: 4.9,
    ramNeededGB: 8.0,
    expectedSpeed: '18-28 tok/s',
    tier: '8-16 GB RAM / Uncensored',
    description: 'Dolphin 3 fine-tune with 128K context. Uncensored, fewer refusals. Note: slightly lower reasoning score.',
    isVision: false,
    isExperimental: false,
    isAbliterated: true,
  },
  {
    id: 'huihui_ai/qwen3-abliterated:8b',
    name: 'Qwen 3 8B Abliterated',
    tag: 'huihui_ai/qwen3-abliterated:8b',
    sizeGB: 5.0,
    ramNeededGB: 8.5,
    expectedSpeed: '18-28 tok/s',
    tier: '8-16 GB RAM / Uncensored',
    description: 'Qwen 3 8B with refusal vectors abliterated. Answers prompts without safety refusals.',
    isVision: false,
    isExperimental: false,
    isAbliterated: true,
  },
  {
    id: 'huihui_ai/gemma-4-abliterated:12b',
    name: 'Gemma 4 12B Abliterated (Vision)',
    tag: 'huihui_ai/gemma-4-abliterated:12b',
    sizeGB: 7.6,
    ramNeededGB: 12.0,
    expectedSpeed: '14-22 tok/s',
    tier: '12-16 GB RAM / Uncensored Vision',
    description: '128K context text + image model with refusal vectors removed.',
    isVision: true,
    isExperimental: false,
    isAbliterated: true,
  },
  {
    id: 'huihui_ai/qwen3-abliterated:14b',
    name: 'Qwen 3 14B Abliterated',
    tag: 'huihui_ai/qwen3-abliterated:14b',
    sizeGB: 9.0,
    ramNeededGB: 14.5,
    expectedSpeed: '10-18 tok/s',
    tier: '16 GB RAM / Heavyweight Uncensored',
    description: 'Qwen 3 14B with refusal suppression. Designed for 16 GB RAM PCs.',
    isVision: false,
    isExperimental: false,
    isAbliterated: true,
  },
  {
    id: 'huihui_ai/qwen3.5-abliterated:27b',
    name: 'Qwen 3.5 27B Abliterated',
    tag: 'huihui_ai/qwen3.5-abliterated:27b',
    sizeGB: 17.0,
    ramNeededGB: 24.0,
    expectedSpeed: '6-12 tok/s',
    tier: '24-32 GB RAM / Frontier Uncensored',
    description: '256K context large parameter model with refusal vectors removed.',
    isVision: false,
    isExperimental: false,
    isAbliterated: true,
  },
  {
    id: 'huihui_ai/llama3.3-abliterated:70b',
    name: 'Llama 3.3 70B Abliterated',
    tag: 'huihui_ai/llama3.3-abliterated:70b',
    sizeGB: 43.0,
    ramNeededGB: 48.0,
    expectedSpeed: '2-5 tok/s',
    tier: '48-64 GB RAM / Ultra Uncensored',
    description: 'Massive 70B parameter model with complete refusal suppression.',
    isVision: false,
    isExperimental: false,
    isAbliterated: true,
  },
  {
    id: 'colibri:glm-5.2',
    name: 'GLM-5.2 (Colibrì Experimental)',
    tag: 'colibri:glm-5.2',
    sizeGB: 372.0,
    ramNeededGB: 25.0,
    expectedSpeed: '0.05-2 tok/s',
    tier: 'Experimental Proof-of-Concept',
    description: '744B parameters offloaded to NVMe SSD. Proof of concept, not a daily chat model.',
    isVision: false,
    isExperimental: true,
  },
];

