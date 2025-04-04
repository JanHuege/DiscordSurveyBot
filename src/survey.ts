export class Survey {
    protected lastSurveyId: number;
    protected kw: number;

    constructor () {
        this.lastSurveyId = -1;
        this.kw = -1;
    }

    isAvailable() {
        return this.kw > -1 && this.lastSurveyId > -1;
    }
  
    saveSurvey(id: number, kw: number) {
      this.lastSurveyId = id;
      this.kw = kw;
    }

    getKW() {
        return this.kw;
    }

    getId() {
        return this.lastSurveyId;
    }
}

export class SurveyResult extends Survey {
    isAvailable() {
        return this.lastSurveyId > -1;
    }

    saveSurvey(id: number, kw: number) {
        this.lastSurveyId = id;
    }
}