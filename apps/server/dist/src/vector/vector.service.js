"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var VectorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const chromadb_1 = require("chromadb");
let VectorService = VectorService_1 = class VectorService {
    config;
    logger = new common_1.Logger(VectorService_1.name);
    client;
    constructor(config) {
        this.config = config;
    }
    async onModuleInit() {
        const apiKey = this.config.get('CHROMA_API_KEY');
        this.client = new chromadb_1.ChromaClient({
            host: 'api.trychroma.com',
            port: 443,
            ssl: true,
            tenant: this.config.get('CHROMA_TENANT'),
            database: this.config.get('CHROMA_DATABASE'),
            headers: { 'X-Chroma-Token': apiKey },
        });
        try {
            await this.client.listCollections();
            this.logger.log('Chroma Cloud connected and verified');
        }
        catch (error) {
            this.logger.warn('Chroma Cloud connection check failed — will retry on first use');
            this.logger.warn(String(error));
        }
    }
    async getCollection(collectionName) {
        return this.client.getOrCreateCollection({
            name: collectionName,
            metadata: { 'hnsw:space': 'cosine' },
        });
    }
    async addDocuments(collectionName, ids, embeddings, documents, metadatas) {
        const collection = await this.getCollection(collectionName);
        await collection.add({ ids, embeddings, documents, metadatas });
    }
    async query(collectionName, queryEmbedding, nResults = 5) {
        const collection = await this.getCollection(collectionName);
        const result = await collection.query({
            queryEmbeddings: [queryEmbedding],
            nResults,
        });
        return {
            ids: result.ids[0],
            documents: result.documents[0],
            distances: result.distances?.[0],
            metadatas: (result.metadatas?.[0] ?? []),
        };
    }
    async deleteByIds(collectionName, ids) {
        const collection = await this.getCollection(collectionName);
        await collection.delete({ ids });
    }
    async deleteCollection(collectionName) {
        await this.client.deleteCollection({ name: collectionName });
    }
    async getCollectionCount(collectionName) {
        const collection = await this.getCollection(collectionName);
        return collection.count();
    }
};
exports.VectorService = VectorService;
exports.VectorService = VectorService = VectorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], VectorService);
//# sourceMappingURL=vector.service.js.map