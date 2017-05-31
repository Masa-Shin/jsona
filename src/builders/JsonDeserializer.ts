import {
    IJsonPropertiesMapper,
    TJsonaModel,
    TJsonaRelationships,
    TJsonApiBody,
    TJsonApiData,
    IJsonaModelBuilder,
} from '../JsonaTypes';

class JsonDeserializer implements IJsonaModelBuilder {

    protected pm: IJsonPropertiesMapper;
    protected body;
    protected includedInObject;

    constructor(propertiesMapper) {
        this.setPropertiesMapper(propertiesMapper);
    }

    setPropertiesMapper(pm): void {
        this.pm = pm;
    }

    setJsonParsedObject(body: TJsonApiBody): void {
        this.body = body;
    }

    build(): TJsonaModel | Array<TJsonaModel> {
        const {data} = this.body;
        let staff;

        if (Array.isArray(data)) {
            staff = [];
            const collectionLength = data.length;

            for (let i = 0; i < collectionLength; i++) {
                const model = this.buildModelByData(data[i]);

                if (model) {
                    staff.push(model);
                }
            }
        } else {
            staff = this.buildModelByData(this.body.data);
        }

        return staff;
    }

    buildModelByData(data: TJsonApiData): TJsonaModel {

        const model = this.pm.createModel(data.type);

        this.pm.setId(model, data.id);
        this.pm.setAttributes(model, data.attributes);

        const relationships: null | TJsonaRelationships = this.buildRelationsByData(data);

        if (relationships) {
            this.pm.setRelationships(model, relationships);
        } 

        return model;
    }

    buildRelationsByData(data: TJsonApiData): TJsonaRelationships | null {
        const readyRelations = {};

        if (data.relationships) {
            for (let k in data.relationships) {
                const relation = data.relationships[k];

                if (Array.isArray(relation.data)) {
                    readyRelations[k] = [];

                    const relationItemsLength = relation.data.length;
                    for (let i = 0; i < relationItemsLength; i++) {
                        let dataItem = this.buildDataFromIncluded(
                            relation.data[i].id,
                            relation.data[i].type
                        );
                        readyRelations[k].push(
                            this.buildModelByData(dataItem)
                        );
                    }
                } else if (relation.data) {
                    let dataItem = this.buildDataFromIncluded(relation.data.id, relation.data.type);
                    readyRelations[k] = this.buildModelByData(dataItem);
                }
            }
        }

        if (Object.keys(readyRelations).length) {
            return <TJsonaRelationships> readyRelations;
        }

        return null;
    }

    buildDataFromIncluded(id: string | number, type: string): TJsonApiData {
        const included = this.buildIncludedInObject();
        const dataItem = included[type + id];

        if (dataItem) {
            return dataItem;
        } else {
            return { id: id, type: type };
        }
    }

    buildIncludedInObject(): { [key: string]: TJsonApiData } {
        if (!this.includedInObject) {
            this.includedInObject = {};

            if (this.body.included) {
                let includedLength = this.body.included.length;
                for (let i = 0; i < includedLength; i++) {
                    let item = this.body.included[i];
                    this.includedInObject[item.type + item.id] = item;
                }
            }
        }

        return this.includedInObject;
    }
}

export default JsonDeserializer;