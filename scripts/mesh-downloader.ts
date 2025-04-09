#!/usr/bin/env ts-node

/**
 * MeSH Downloader and Processor
 * Downloads the MeSH RDF dataset from https://id.nlm.nih.gov/mesh/ and
 * processes it into a structured JSON format optimized for the search strategy builder.
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';
import { N3Parser } from 'n3';
import { program } from 'commander';
import { green, red, yellow, blue, cyan } from 'chalk';
import ora from 'ora';
import type { 
  MeshDescriptor, 
  MeshConcept, 
  MeshTerm, 
  MeshQualifier,
  MeshDataset,
  MeshSearchIndex,
  ProcessedMeshData
} from '../src/lib/mesh/types';

// Constants
const MESH_DOWNLOAD_URL = 'https://id.nlm.nih.gov/mesh/download/mesh.nt.gz';
const DEFAULT_OUTPUT_DIR = path.join(__dirname, '..', 'data', 'mesh');
const DEFAULT_TEMP_DIR = path.join(__dirname, '..', 'tmp');

// RDF predicates from MeSH
const RDF_PREDICATES = {
  TYPE: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
  LABEL: 'http://www.w3.org/2000/01/rdf-schema#label',
  DESCRIPTOR: 'http://id.nlm.nih.gov/mesh/vocab#descriptor',
  CONCEPT: 'http://id.nlm.nih.gov/mesh/vocab#concept',
  TERM: 'http://id.nlm.nih.gov/mesh/vocab#term',
  PREFERRED_TERM: 'http://id.nlm.nih.gov/mesh/vocab#preferredTerm',
  PREFERRED_CONCEPT: 'http://id.nlm.nih.gov/mesh/vocab#preferredConcept',
  SCOPE_NOTE: 'http://id.nlm.nih.gov/mesh/vocab#scopeNote',
  TREE_NUMBER: 'http://id.nlm.nih.gov/mesh/vocab#treeNumber',
  TERM_RELATION: 'http://id.nlm.nih.gov/mesh/vocab#termRelation',
  CONCEPT_RELATION: 'http://id.nlm.nih.gov/mesh/vocab#conceptRelation',
  QUALIFIER: 'http://id.nlm.nih.gov/mesh/vocab#qualifier',
  ALLOWABLE_QUALIFIER: 'http://id.nlm.nih.gov/mesh/vocab#allowableQualifier',
  PHARM_ACTION: 'http://id.nlm.nih.gov/mesh/vocab#pharmacologicalAction',
  BROADER_CONCEPT: 'http://id.nlm.nih.gov/mesh/vocab#broaderConcept',
  NARROWER_CONCEPT: 'http://id.nlm.nih.gov/mesh/vocab#narrowerConcept',
  CONCEPT_UI: 'http://id.nlm.nih.gov/mesh/vocab#conceptUI',
  DESCRIPTOR_UI: 'http://id.nlm.nih.gov/mesh/vocab#descriptorUI',
  QUALIFIER_UI: 'http://id.nlm.nih.gov/mesh/vocab#qualifierUI',
  TERM_UI: 'http://id.nlm.nih.gov/mesh/vocab#termUI',
};

// Command line interface setup
program
  .name('mesh-downloader')
  .description('Download and process MeSH RDF dataset')
  .version('1.0.0')
  .option('-o, --output <dir>', 'output directory for processed files', DEFAULT_OUTPUT_DIR)
  .option('-t, --temp <dir>', 'temporary directory for downloads', DEFAULT_TEMP_DIR)
  .option('-f, --force', 'force download even if files already exist', false)
  .option('--skip-download', 'skip downloading and use existing files', false)
  .option('--metadata <file>', 'path to custom metadata file')
  .parse(process.argv);

const options = program.opts();

// Ensure directories exist
function ensureDirectoryExists(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Download MeSH RDF dataset
async function downloadMeshDataset(tempDir: string, force: boolean): Promise<string> {
  const spinner = ora('Downloading MeSH dataset...').start();
  const tempFilePath = path.join(tempDir, 'mesh.nt.gz');
  const extractedFilePath = path.join(tempDir, 'mesh.nt');
  
  ensureDirectoryExists(tempDir);
  
  // Check if files already exist
  if (!force && fs.existsSync(extractedFilePath)) {
    spinner.succeed('Using existing MeSH dataset.');
    return extractedFilePath;
  }
  
  try {
    // Download gzipped file
    const response = await axios({
      method: 'GET',
      url: MESH_DOWNLOAD_URL,
      responseType: 'stream'
    });
    
    const writer = createWriteStream(tempFilePath);
    response.data.pipe(writer);
    
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
    spinner.text = 'Extracting MeSH dataset...';
    
    // Extract the gzipped file
    await pipeline(
      createReadStream(tempFilePath),
      createGunzip(),
      createWriteStream(extractedFilePath)
    );
    
    spinner.succeed('MeSH dataset downloaded and extracted.');
    return extractedFilePath;
  } catch (error) {
    spinner.fail('Failed to download MeSH dataset.');
    console.error(red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Process the N-Triples file into structured JSON
async function processNTriples(filePath: string): Promise<ProcessedMeshData> {
  const spinner = ora('Processing MeSH dataset...').start();
  
  // Temporary data structures for processing
  const descriptors: Record<string, Partial<MeshDescriptor>> = {};
  const concepts: Record<string, Partial<MeshConcept>> = {};
  const terms: Record<string, Partial<MeshTerm>> = {};
  const qualifiers: Record<string, Partial<MeshQualifier>> = {};
  const descriptorConceptMap: Record<string, string[]> = {};
  const conceptTermMap: Record<string, string[]> = {};
  const descriptorQualifierMap: Record<string, string[]> = {};
  
  // Parse the N-Triples file
  const parser = new N3Parser();
  const fileStream = createReadStream(filePath);
  
  let triplesCount = 0;
  let lastReportTime = Date.now();
  
  for await (const quad of parser.parse(fileStream)) {
    triplesCount++;
    
    // Report progress periodically
    if (triplesCount % 100000 === 0) {
      const currentTime = Date.now();
      const elapsedSecs = (currentTime - lastReportTime) / 1000;
      const tripsPerSec = Math.round(100000 / elapsedSecs);
      lastReportTime = currentTime;
      spinner.text = `Processing MeSH dataset... ${triplesCount.toLocaleString()} triples (${tripsPerSec.toLocaleString()}/sec)`;
    }
    
    const subject = quad.subject.value;
    const predicate = quad.predicate.value;
    const object = quad.object.value;
    
    // Process each triple based on predicate
    if (predicate === RDF_PREDICATES.TYPE) {
      if (object === RDF_PREDICATES.DESCRIPTOR) {
        const id = subject.split('/').pop() as string;
        descriptors[id] = descriptors[id] || { descriptorUI: '', descriptorName: '', treeNumbers: [], concepts: [] };
      } else if (object === RDF_PREDICATES.CONCEPT) {
        const id = subject.split('/').pop() as string;
        concepts[id] = concepts[id] || { conceptUI: '', preferredConceptName: '', synonyms: [], isPreferredConcept: false };
      } else if (object === RDF_PREDICATES.TERM) {
        const id = subject.split('/').pop() as string;
        terms[id] = terms[id] || { termUI: '', termName: '', isPreferredTerm: false };
      } else if (object === RDF_PREDICATES.QUALIFIER) {
        const id = subject.split('/').pop() as string;
        qualifiers[id] = qualifiers[id] || { qualifierUI: '', qualifierName: '' };
      }
    } 
    // Process descriptor properties
    else if (subject in descriptors) {
      const descriptor = descriptors[subject];
      
      if (predicate === RDF_PREDICATES.DESCRIPTOR_UI) {
        descriptor.descriptorUI = object;
      } else if (predicate === RDF_PREDICATES.LABEL) {
        descriptor.descriptorName = object;
      } else if (predicate === RDF_PREDICATES.SCOPE_NOTE) {
        descriptor.scopeNote = object;
      } else if (predicate === RDF_PREDICATES.TREE_NUMBER) {
        descriptor.treeNumbers = descriptor.treeNumbers || [];
        descriptor.treeNumbers.push(object);
      } else if (predicate === RDF_PREDICATES.CONCEPT) {
        const conceptId = object.split('/').pop() as string;
        descriptorConceptMap[subject] = descriptorConceptMap[subject] || [];
        descriptorConceptMap[subject].push(conceptId);
      } else if (predicate === RDF_PREDICATES.ALLOWABLE_QUALIFIER) {
        const qualifierId = object.split('/').pop() as string;
        descriptorQualifierMap[subject] = descriptorQualifierMap[subject] || [];
        descriptorQualifierMap[subject].push(qualifierId);
      } else if (predicate === RDF_PREDICATES.PHARM_ACTION) {
        descriptor.pharmacologicalAction = descriptor.pharmacologicalAction || [];
        descriptor.pharmacologicalAction.push(object);
      }
    }
    // Process concept properties
    else if (subject in concepts) {
      const concept = concepts[subject];
      
      if (predicate === RDF_PREDICATES.CONCEPT_UI) {
        concept.conceptUI = object;
      } else if (predicate === RDF_PREDICATES.LABEL) {
        concept.preferredConceptName = object;
      } else if (predicate === RDF_PREDICATES.PREFERRED_TERM) {
        const termId = object.split('/').pop() as string;
        if (terms[termId]) {
          terms[termId].isPreferredTerm = true;
        }
      } else if (predicate === RDF_PREDICATES.TERM) {
        const termId = object.split('/').pop() as string;
        conceptTermMap[subject] = conceptTermMap[subject] || [];
        conceptTermMap[subject].push(termId);
      } else if (predicate === RDF_PREDICATES.BROADER_CONCEPT || 
                predicate === RDF_PREDICATES.NARROWER_CONCEPT) {
        const relatedConceptId = object.split('/').pop() as string;
        concept.relationToConcept = concept.relationToConcept || [];
        concept.relationToConcept.push({
          relatedConceptUI: relatedConceptId,
          relationType: predicate === RDF_PREDICATES.BROADER_CONCEPT ? 'broader' : 'narrower'
        });
      }
    }
    // Process term properties
    else if (subject in terms) {
      const term = terms[subject];
      
      if (predicate === RDF_PREDICATES.TERM_UI) {
        term.termUI = object;
      } else if (predicate === RDF_PREDICATES.LABEL) {
        term.termName = object;
      }
    }
    // Process qualifier properties
    else if (subject in qualifiers) {
      const qualifier = qualifiers[subject];
      
      if (predicate === RDF_PREDICATES.QUALIFIER_UI) {
        qualifier.qualifierUI = object;
      } else if (predicate === RDF_PREDICATES.LABEL) {
        qualifier.qualifierName = object;
      }
    }
  }
  
  // Process the temporary data structures into final format
  const finalData: ProcessedMeshData = {
    dataset: {
      descriptors: {} as Record<string, MeshDescriptor>,
      totalCount: 0,
      version: new Date().getFullYear().toString(),
      lastUpdated: new Date().toISOString()
    },
    searchIndex: {
      terms: {},
      treeMap: {},
      qualifierMap: {}
    }
  };
  
  // Build the final descriptor objects with their concepts and terms
  Object.entries(descriptors).forEach(([id, descriptor]) => {
    if (!descriptor.descriptorUI) return;
    
    const descriptorUI = descriptor.descriptorUI;
    const concepts: MeshConcept[] = [];
    
    // Add concepts to this descriptor
    const conceptIds = descriptorConceptMap[id] || [];
    conceptIds.forEach(conceptId => {
      const concept = concepts[conceptId];
      if (!concept || !concept.conceptUI) return;
      
      const synonyms: MeshTerm[] = [];
      
      // Add terms to this concept
      const termIds = conceptTermMap[conceptId] || [];
      termIds.forEach(termId => {
        const term = terms[termId];
        if (!term || !term.termUI) return;
        
        synonyms.push(term as MeshTerm);
        
        // Add to search index
        const normalizedTerm = term.termName.toLowerCase();
        finalData.searchIndex.terms[normalizedTerm] = 
          finalData.searchIndex.terms[normalizedTerm] || [];
        
        if (!finalData.searchIndex.terms[normalizedTerm].includes(descriptorUI)) {
          finalData.searchIndex.terms[normalizedTerm].push(descriptorUI);
        }
      });
      
      concepts.push({
        ...concept as MeshConcept,
        synonyms
      });
    });
    
    // Add allowable qualifiers
    let allowableQualifiers: MeshQualifier[] | undefined;
    const qualifierIds = descriptorQualifierMap[id] || [];
    if (qualifierIds.length > 0) {
      allowableQualifiers = [];
      qualifierIds.forEach(qualifierId => {
        const qualifier = qualifiers[qualifierId];
        if (qualifier && qualifier.qualifierUI) {
          allowableQualifiers!.push(qualifier as MeshQualifier);
          
          // Add to qualifier map
          finalData.searchIndex.qualifierMap[qualifier.qualifierUI] = 
            finalData.searchIndex.qualifierMap[qualifier.qualifierUI] || [];
          
          if (!finalData.searchIndex.qualifierMap[qualifier.qualifierUI].includes(descriptorUI)) {
            finalData.searchIndex.qualifierMap[qualifier.qualifierUI].push(descriptorUI);
          }
        }
      });
    }
    
    // Add to tree map
    (descriptor.treeNumbers || []).forEach(treeNumber => {
      finalData.searchIndex.treeMap[treeNumber] = 
        finalData.searchIndex.treeMap[treeNumber] || [];
      
      if (!finalData.searchIndex.treeMap[treeNumber].includes(descriptorUI)) {
        finalData.searchIndex.treeMap[treeNumber].push(descriptorUI);
      }
    });
    
    // Add the complete descriptor to the dataset
    finalData.dataset.descriptors[descriptorUI] = {
      ...descriptor as MeshDescriptor,
      concepts,
      allowableQualifiers,
      createdAt: new Date().toISOString()
    };
  });
  
  finalData.dataset.totalCount = Object.keys(finalData.dataset.descriptors).length;
  
  spinner.succeed(`Processed ${triplesCount.toLocaleString()} triples into ${finalData.dataset.totalCount.toLocaleString()} MeSH descriptors.`);
  
  return finalData;
}

// Save processed data to files
async function saveProcessedData(data: ProcessedMeshData, outputDir: string): Promise<void> {
  const spinner = ora('Saving processed data...').start();
  
  ensureDirectoryExists(outputDir);
  
  // Save the dataset
  const datasetPath = path.join(outputDir, 'mesh-dataset.json');
  await fs.promises.writeFile(
    datasetPath, 
    JSON.stringify(data.dataset, null, 2)
  );
  
  // Save the search index
  const indexPath = path.join(outputDir, 'mesh-index.json');
  await fs.promises.writeFile(
    indexPath, 
    JSON.stringify(data.searchIndex, null, 2)
  );
  
  // Save a compressed version for efficient loading
  const compressedPath = path.join(outputDir, 'mesh-complete.json');
  await fs.promises.writeFile(
    compressedPath, 
    JSON.stringify(data)
  );
  
  // Save metadata
  const metaPath = path.join(outputDir, 'metadata.json');
  const metadata = {
    totalDescriptors: data.dataset.totalCount,
    totalTerms: Object.keys(data.searchIndex.terms).length,
    processingDate: new Date().toISOString(),
    version: data.dataset.version,
    datasetSize: fs.statSync(datasetPath).size,
    indexSize: fs.statSync(indexPath).size,
    compressedSize: fs.statSync(compressedPath).size
  };
  
  await fs.promises.writeFile(
    metaPath, 
    JSON.stringify(metadata, null, 2)
  );
  
  spinner.succeed(`Saved processed data to ${cyan(outputDir)}`);
  console.log(green('  Dataset:'), `${metadata.totalDescriptors.toLocaleString()} descriptors (${(metadata.datasetSize / 1024 / 1024).toFixed(2)} MB)`);
  console.log(green('  Index:'), `${metadata.totalTerms.toLocaleString()} terms (${(metadata.indexSize / 1024 / 1024).toFixed(2)} MB)`);
  console.log(green('  Compressed:'), `${(metadata.compressedSize / 1024 / 1024).toFixed(2)} MB`);
}

// Main function
async function main(): Promise<void> {
  console.log(blue('MeSH Downloader and Processor'));
  console.log(yellow('Processing MeSH data from https://id.nlm.nih.gov/mesh/'));
  
  try {
    // Prepare directories
    ensureDirectoryExists(options.output);
    ensureDirectoryExists(options.temp);
    
    // Download or use existing data
    let meshFilePath;
    if (options.skipDownload) {
      meshFilePath = path.join(options.temp, 'mesh.nt');
      if (!fs.existsSync(meshFilePath)) {
        console.error(red('Error:'), `Skipping download but file does not exist: ${meshFilePath}`);
        process.exit(1);
      }
    } else {
      meshFilePath = await downloadMeshDataset(options.temp, options.force);
    }
    
    // Process the data
    const processedData = await processNTriples(meshFilePath);
    
    // Save the processed data
    await saveProcessedData(processedData, options.output);
    
    console.log(green('✓ MeSH data processing complete!'));
  } catch (error) {
    console.error(red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error(red('Fatal error:'), error);
  process.exit(1);
}); 