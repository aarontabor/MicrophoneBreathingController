const defaultControllerSettings = {
  'EventBasedController_WindowLengthMillis': 500,
  'EventBasedController_ConfidenceThreshold': 0.9,
  'MicrophoneStreamer_WindowLengthMillis': 250,
  'MicrophoneStreamer_InhaleThreshold': 0.009,
  'MicrophoneStreamer_ExhaleThreshold': 0.03,
  'MicrophoneStreamer_RejectionThreshold': 0.8,
};


class EventBasedController {
  constructor(settings = defaultControllerSettings) {
    this.settings = settings;
    this.microphoneStreamer = new MicrophoneStreamer(this.settings);
    
    // TODO, this dosn't automatically react to settings updates
    this.classifications = new RollingWindow(settings.EventBasedController_WindowLengthMillis);
    
    this.class = 'unclassified';
    this.eventHandlers = {};
  }
  
  register(className, callbackFunction) {
    if (!(className in this.eventHandlers)) {
      this.eventHandlers[className] = [];
    } 
    this.eventHandlers[className].push(callbackFunction);
  }
  
  update() {
    this.microphoneStreamer.update();
    this.classifications.push(this.microphoneStreamer.class);
    
    // Step 1. Tally occurences by class
    let tally = _.countBy(this.classifications.values);
    let [candidateClass, candidateCount] = _.maxBy(Object.entries(tally), ([breathingClass, count]) => count);
    
    // Step 2. Test candidate class against confidence threshold and trigger events if appropriate
    if (this.class != candidateClass && candidateCount / this.classifications.values.length > this.settings.EventBasedController_ConfidenceThreshold) {
      this.class = candidateClass;
      if (candidateClass in this.eventHandlers) {
        this.eventHandlers[candidateClass].forEach(f => f());
      }
    }
  }
}


class MicrophoneStreamer {
  constructor(settings = defaultControllerSettings) {
    this.settings = {...settings};
    
    // Todo, this doesn't dynamically
    this.samples = new RollingWindow(settings.MicrophoneStreamer_WindowLengthMillis);
    
    this.class = 'unclassified';
    
    this.mic = new p5.AudioIn();
    this.mic.start();
  }
  
  update() {
    this.samples.push(this.mic.getLevel());

    let medianLevel = this._median(this.samples.values);
    let varianceLevel = this._variance(this.samples.values);
    
    if (varianceLevel / medianLevel > this.settings.MicrophoneStreamer_RejectionThreshold) {
      this.class = 'noise';
    } else if (medianLevel < this.settings.MicrophoneStreamer_InhaleThreshold) {
      this.class = 'pause';
    } else if (medianLevel < this.settings.MicrophoneStreamer_ExhaleThreshold) {
      this.class = 'inhale';
    } else {
      this.class = 'exhale';
    }
  }

  _median(arr) {
    if (arr.length == 0) {
      return 0;
    }

    let sorted = _.sortBy(arr);
    let len = arr.length;
    if (len % 2) {
      return sorted[floor(len/2)];
    } else {
      return (sorted[floor(len/2)] + sorted[ceil(len/2)]) / 2;
    }
  }
  
  _variance(arr) {
    if (arr.length == 0) {
      return 0;
    }

    var mean = _.mean(arr);
    var sumOfSquareDifferences = _.sum(_.map(arr, val => Math.pow(val - mean, 2)));
    return Math.sqrt(sumOfSquareDifferences / arr.length);
  }
}


class RollingWindow {
  constructor(windowLengthMillis) {
    this.timestampedValues = [];
    this.windowLengthMillis = windowLengthMillis;
  }
  
  push(value) {
    let t = Date.now();
    this.timestampedValues.push({t: t, value: value});
    while(this.timestampedValues.length && t - this.timestampedValues[0].t > this.windowLengthMillis) {
      this.timestampedValues.shift();
    }
  }
  
  get values() {
    return this.timestampedValues.map(({timestamp, value}) => value);
  }
}