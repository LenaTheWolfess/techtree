/**
 * This class represents the Technology Tree GUI page.
 *
 * Further methods are described within draw.js
 */
 
class TechtreePage extends ReferencePage
{
	constructor(data)
	{
		super();

		this.structureBoxes = [];
		this.trainerBoxes = [];

		this.TechtreePage = Engine.GetGUIObjectByName("techtreePage");
		this.Background = Engine.GetGUIObjectByName("background");
		this.CivEmblem = Engine.GetGUIObjectByName("civEmblem");
		this.CivName = Engine.GetGUIObjectByName("civName");
		this.CivHistory = Engine.GetGUIObjectByName("civHistory");

//		this.TreeSection = new TreeSection(this);

		this.civSelection = new CivSelectDropdown(this.civData);
		if (!this.civSelection.hasCivs())
		{
			this.closePage();
			return;
		}
		this.civSelection.registerHandler(this.selectCiv.bind(this));

		let civInfoButton = new CivInfoButton(this);
		let structreeButton = new StructreeButton(this);
		let closeButton = new CloseButton(this);
		Engine.SetGlobalHotkey("techtree", "Press", this.closePage.bind(this));

		this.TechtreePage.onWindowResized = this.updatePageWidth.bind(this);
		this.width = 0;
		
		/****OLD DATA***/
		this.parsedData = {
			"units": {},
			"structures": {},
			"techs": {},
			"phases": {}
		};
		/**
		 * Array of structure template names when given a civ and a phase name.
		 */
		this.techList = {};
		this.startingTechs = {};
		this.selectedTech = "phase_village";
		this.selectedBuilding = "structures";
		this.selectedCiv;
		//this.civData = loadCivData(true, false);
		
		this.currentModifiers = {};
		
		this.g_ResourceData = new Resources();
		
		this.g_TechnologyTranslateKeys = ["genericName", "tooltip", "description"];
		this.g_AuraPath = "simulation/data/auras/";
		this.g_TechnologyPath = "simulation/data/technologies/";
		
		this.g_AuraData = {};
		this.g_TemplateData = {};
		this.g_TechnologyData = {};
		
		this.autoResearchTechList = this.findAllAutoResearchedTechs();
	}

	closePage()
	{
		Engine.PopGuiPage({ "civ": this.activeCiv, "page": "page_techtree.xml" });
	}

	selectCiv(civCode)
	{
		this.setActiveCiv(civCode);

		this.CivEmblem.sprite = "stretched:" + this.civData[this.activeCiv].Emblem;
		this.CivName.caption = this.civData[this.activeCiv].Name;
		this.CivHistory.caption = this.civData[this.activeCiv].History || "";

		let templateLists = this.TemplateLister.getTemplateLists(this.activeCiv);
		
		this.selectCivOld(civCode);
		
		this.updatePageWidth();
		this.updatePageHeight();
	}
	
	updatePageHeight()
	{
		return;
	//	let y = (this.TreeSection.height + this.TreeSection.vMargin) / 2;
		let y = 0;
		let pageSize = this.TechtreePage.size;
		pageSize.top = -y;
		pageSize.bottom = y;
		this.TechtreePage.size = pageSize;
	}

	updatePageWidth()
	{
		let screenSize = this.Background.getComputedSize();
		let pageSize = this.TechtreePage.size;
		let x = Math.min(this.width, screenSize.right - this.BorderMargin * 2) / 2;
		pageSize.left = -x;
		pageSize.right = x;
		this.TechtreePage.size = pageSize;
	}
	
	
	/*********OLD CODE*******/
	
	selectTech(techCode)
	{
		if (this.techList[this.selectedCiv] && this.techList[this.selectedCiv][techCode]) {
			this.selectedTech = techCode;
		}
	}

	selectStruct(structCode)
	{
		this.selectedBuilding = structCode;
		this.selectedTech = "";
		if (this.startingTechs[this.selectedCiv] && this.startingTechs[this.selectedCiv][this.selectedBuilding]) {
			this.selectTech(this.startingTechs[this.selectedCiv][this.selectedBuilding][0]);
		}
	}

	/**
	 * @param {string} civCode
	 */
	selectCivOld(civCode)
	{
		if (civCode === this.selectedCiv || !this.civData[civCode])
			return;

		this.selectedCiv = civCode;
		if (this.selectedCiv != this.activeCiv) {
			error(this.selectedCiv + " != " + this.activeCiv);
		}

		this.currentModifiers = this.deriveModifications(this.autoResearchTechList, civCode);

		// If a buildList already exists, then this civ has already been parsed
		if (this.techList[civCode])
		{
			this.draw(civCode);
			return;
		}
		
		let templateLists = this.TemplateLister.getTemplateLists(civCode);

		this.parsedData.units = this.loadEntityData(templateLists.units.keys(), this.parsedData.units, civCode, this.currentModifiers);
		this.parsedData.structures = this.loadEntityData(templateLists.structures.keys(), this.parsedData.structures, civCode, this.currentModifiers);
		this.parsedData = this.loadTechnologies(templateLists.techs.keys(), this.parsedData, civCode);
				
		// Establish phase order
		this.parsedData.phaseList = UnravelPhases(this.parsedData.phases);

		// Load any required generic phases that aren't already loaded
		this.parsedData.phases = this.loadPhases(this.parsedData.phaseList, this.parsedData.phases, civCode);
		
		let techList = {};
		let startList = {};
		// Get all technologies for selected civ
		for (let structCode of templateLists.structures.keys())
		{
			let structInfo = this.parsedData.structures[structCode];
			// Add technologies
			for (let prod of structInfo.production.techs)
			{
				if (this.isPhaseTech(prod))// basename(prod).startsWith("phase"))
					continue;
				let same = false;
				if (!(prod in techList)) {
					techList[prod] = {"require": [], "unlocks": [], "buildings": [], "units": [], "phase": this.getPhaseOfTemplate(structInfo, civCode)};
				}
				let reqs = this.getTechSupersedes(prod, civCode);
				if (reqs === false)
					continue;
				let pName = this.getPhaseOfTemplate(structInfo, civCode);
				let ptName = this.getPhaseOfTechnology(prod, civCode);
				let pId =  this.parsedData.phaseList.indexOf(pName);
				// loop through all buildings and return minimum phase
				for (let b of techList[prod].buildings) {
					let bs = this.parsedData.structures[b];
					pId = Math.min(pId, this.parsedData.phaseList.indexOf(this.getPhaseOfTemplate(bs, civCode)));
				}
				pId = Math.max(pId, this.parsedData.phaseList.indexOf(ptName));
				techList[prod].phase = this.parsedData.phaseList[pId];
			//	warn(prod + " " + "(" + pId + ") "  + techList[prod].phase + " phase of template " + this.parsedData.phaseList.indexOf(pName) );
				for (let req in reqs) {
					if (basename(reqs[req]).startsWith("phase"))
						continue;
					if (!(reqs[req] in techList)) {
						techList[reqs[req]] = {"require": [], "unlocks": [], "buildings": [], "units": [], "phase": "phase_village"};
					}
					if (techList[reqs[req]].unlocks.indexOf(prod) == -1)
						techList[reqs[req]].unlocks.push(prod);
					if (techList[prod].require.indexOf(reqs[req]) == -1)
						techList[prod].require.push(reqs[req]);
					// do not add to structure root technology if has requirement
					// from the same building
					if (structInfo.production.techs.indexOf(reqs[req]) != -1)
						same = true;
				}	
				if (techList[prod].buildings.indexOf(structCode) == -1)
					techList[prod].buildings.push(structCode);
				if (techList[prod].require.length == 0 || !same) {
					if (!(structCode in startList)) {
						startList[structCode] = [];
					}
					if (startList[structCode].indexOf(prod) == -1)
						startList[structCode].push(prod);
					this.selectedBuilding = structCode;
					this.selectedTech = prod;
				}
			}
			// Add units to technologies
			for (let prod of structInfo.production.units)
			{
				let template = this.parsedData.units[prod];
				if (!template)
					continue;
				let tech = template.requiredTechnology;
				if (tech) {
					if (!(tech in techList)) {
						techList[tech] ={"require": [], "unlocks": [], "buildings": [], "units": [], "phase": "phase_village"};
					}
					if (techList[tech].units.indexOf(prod) == -1)
						techList[tech].units.push(prod);
				}
			}
		}	
		
		this.techList[civCode] = techList;
		this.startingTechs[civCode] = startList;
		this.selectStruct(Object.keys(startList)[0]);
		this.draw(civCode);
	}

	/**** OLD DRAW CODE ****/
	loadEntityData(keys, entities, civCode, modifiers)
	{
		for (let k of keys) {
			if (!entities[k]) {
				entities[k] = this.loadEntityTemplate(k, civCode, modifiers);
			}
		}
		return entities;
	}
	loadTechnologies(keys, data, civCode) {
		data.techs[civCode] = {};
		for (let techcode of keys) {
			if (basename(techcode).startsWith("phase"))
				data.phases[techcode] = this.loadPhase(techcode, civCode);
			else
				data.techs[civCode][techcode] = this.loadTechnology(techcode, civCode);
		}
		return data;
	}
	loadPhases(keys, phases, civCode) {
		for (let phasecode of keys) {
			if (!phases[phasecode])
				phases[phasecode] = this.loadPhase(phasecode, civCode);
		}
		return phases;
	}
	isPhaseTech(technologyCode)
	{
		return basename(technologyCode).startsWith("phase");
	}
	/**
	 * Functions used to collate the contents of a tooltip.
	 */
	 
	
	/**
	 * Draw the techtree
	 *
	 * (Actually resizes and changes visibility of elements, and populates text)
	 */
	draw(civCode)
	{
		// Set basic state (positioning of elements mainly), but only once
		//if (!Object.keys(this.g_DrawLimits).length)
			this.predraw(civCode);

		let leftMargin = Engine.GetGUIObjectByName("tree_display").size.left;

		let phaseList = this.parsedData.phaseList;

		Engine.GetGUIObjectByName("root_caption").caption = "";
		Engine.GetGUIObjectByName("pair_caption").caption = "";
		
		let i = 0;
		for (let sc in this.startingTechs[civCode])
		{
			let structCode = sc;
			let thisEle = Engine.GetGUIObjectByName("struct["+i+"]_icon");
			if (thisEle === undefined)
			{
				error("\""+civCode+"\" has more starting buildings than can be supported by the current GUI layout");
				break;
			}
			let struct = this.parsedData.structures[structCode];
			if (!struct) {
				warn("structure " + structCode + " is not in parsed data");
				continue;
			}
			let grayscale = this.selectedBuilding == sc ? "" : "grayscale:";
			thisEle.sprite = "stretched:"+grayscale+"session/portraits/"+struct.icon;
			thisEle.tooltip =  '[font="sans-bold-16"]' + struct.name.generic + '[/font]\n(' + struct.name.specific+")";
			let that = this;
			thisEle.onPress = function() {
				that.selectStruct(structCode);
				that.draw(civCode);
			}
			++i;
		}
		i = 0;
		if (this.startingTechs[civCode] && this.startingTechs[civCode][this.selectedBuilding])
		{
			for (let techCode of this.startingTechs[civCode][this.selectedBuilding])
			{
				let thisEle = Engine.GetGUIObjectByName("tech["+i+"]_icon");
				if (thisEle === undefined)
				{
					error("\""+civCode+"\" has more starting techs than can be supported by the current GUI layout");
					break;
				}
				let tech = this.parsedData.techs[civCode][techCode];
				if (techCode.startsWith("phase")) {
					tech = this.parsedData.phases[techCode];
				}
				let startTechIcon = Engine.GetGUIObjectByName("tech["+i+"]_icon");
				
				let grayscale = this.selectedTech == techCode ? "" : "grayscale:";
				startTechIcon.sprite = "stretched:"+grayscale+"session/portraits/"+tech.icon;
				startTechIcon.tooltip = '[font="sans-bold-16"]' + tech.name.generic+ '[/font]\n'+ tech.description;
				let that = this;
				startTechIcon.onPress = function() {
					that.selectTech(tech.name.internal);
					that.draw(civCode);
				}
				++i;
		}
		}
		// Draw requirements
		i = 0;
		if (this.techList[civCode][this.selectedTech]) {
			for (let struct of this.techList[civCode][this.selectedTech].buildings)
			{
				let thisEle = Engine.GetGUIObjectByName("req_struct");
				if (thisEle === undefined)
				{
					error("\""+civCode+"\" has more techs in phase " +
						  pha + " than can be supported by the current GUI layout");
					break;
				}
				let child = this.parsedData.structures[struct];
				
				thisEle.sprite =	"stretched:session/portraits/"+child.icon;
				thisEle.tooltip = '[font="sans-bold-16"]' + child.name.generic + '[/font]\n(' + child.name.specific+")";
				let that = this;
				thisEle.onPress = function() {
					that.selectStruct(struct);
					that.draw(civCode);
				}
				thisEle.hidden = false;
				break;
			}
			for (let tech of this.techList[civCode][this.selectedTech].require)
			{
				let thisEle = Engine.GetGUIObjectByName("req["+i+"]_icon");
				if (thisEle === undefined)
				{
					error("\""+civCode+"\" has more techs in phase " +
						  pha + " than can be supported by the current GUI layout");
					break;
				}
				let child = this.parsedData.techs[civCode][tech];
				if (!child) {
					warn("Technology not parsed for " + tech);
					continue;
				}
				thisEle.sprite =	"stretched:session/portraits/"+child.icon;
				thisEle.tooltip = '[font="sans-bold-16"]' +  child.name.generic + '[/font]\n' + child.description;
				let that = this;
				thisEle.onPress = function() {
					that.selectTech(child.name.internal);
					that.draw(civCode);
				}
				thisEle.hidden = false;

				++i;
			}
		}
		
		let rootIcon = Engine.GetGUIObjectByName("root");
		let pairIcon = Engine.GetGUIObjectByName("pair");
		let rootTech = this.parsedData.techs[civCode][this.selectedTech];

		if (rootTech) {
			let pairedTech;
			let pair = rootTech.paired;
			if (pair)
				pairedTech = this.parsedData.techs[civCode][pair];
			pairIcon.hidden = true;
			if (pairedTech) {
				pairIcon.sprite = "stretched:session/portraits/"+pairedTech.icon;
				pairIcon.tooltip = '[font="sans-bold-16"]' + pairedTech.name.generic + '[/font]\n' + pairedTech.description;
				Engine.GetGUIObjectByName("pair_caption").caption = "Paired with";
				let that = this;
				pairIcon.onPress = function() {
					that.selectTech(pairedTech.name.internal);
					that.draw(civCode);
				}
				pairIcon.hidden = false;
			}
			rootIcon.sprite = "stretched:session/portraits/"+rootTech.icon;
			rootIcon.tooltip = rootTech.name.generic + "\n" + rootTech.description;
			Engine.GetGUIObjectByName("root_caption").caption = rootTech.name.generic;
			rootIcon.hidden = false;
		} else {
			rootIcon.hidden = true;
			pairIcon.hidden = true;
		}
		
		// Draw unlocks
		if (this.techList[civCode][this.selectedTech]) {
			i = 0;	
			Engine.GetGUIObjectByName("unlock_caption").hidden = !this.techList[civCode][this.selectedTech].unlocks.length;
			for (let tech of this.techList[civCode][this.selectedTech].unlocks)
			{
				let thisEle = Engine.GetGUIObjectByName("unlock["+i+"]_icon");
				if (thisEle === undefined)
				{
					error("\""+civCode+"\" has more techs in phase " +
						  pha + " than can be supported by the current GUI layout");
					break;
				}
				let child = this.parsedData.techs[civCode][tech];
				
				thisEle.sprite =	"stretched:session/portraits/"+child.icon;
				thisEle.tooltip = '[font="sans-bold-16"]' +  child.name.generic + '[/font]\n' + child.description;
				let that = this;
				thisEle.onPress = function() {
					that.selectTech(child.name.internal);
					that.draw(civCode);
				}
				thisEle.hidden = false;

				++i;
			}
			i = 0;
			Engine.GetGUIObjectByName("unlock_unit_caption").hidden = !this.techList[civCode][this.selectedTech].units.length;
			for (let unit of this.techList[civCode][this.selectedTech].units)
			{
				let thisEle = Engine.GetGUIObjectByName("unlock_unit["+i+"]_icon");
				if (thisEle === undefined)
				{
					error("\""+civCode+"\" has more techs in phase " +
						  pha + " than can be supported by the current GUI layout");
					break;
				}
				let child = this.parsedData.units[unit];
				
				thisEle.sprite =	"stretched:session/portraits/"+child.icon;
				thisEle.tooltip = '[font="sans-bold-16"]' +  child.name.generic + '[/font]\n(' + child.name.specific+")";
				EntityBox.setViewerOnPress(thisEle, unit);
				thisEle.hidden = false;
				++i;
			}
		}
		let size = Engine.GetGUIObjectByName("display_tree").size;
		size.right = -4;
		Engine.GetGUIObjectByName("display_tree").size = size;
	}

	/**
	 * Positions certain elements that only need to be positioned once
	 * (as <repeat> does not position automatically).
	 *
	 * Also detects limits on what the GUI can display by iterating through the set
	 * elements of the GUI. These limits are then used by draw().
	 */
	predraw(civCode)
	{
		let phaseList = this.parsedData.phaseList;
		let scale = 40;
		let initIconSize = {"left": 0, "right": scale, "top": 0, "bottom": scale};

		let phaseCount = phaseList.length;
		let i = 0;
		let row = 0;
		let rowSize = initIconSize.top - initIconSize.bottom;
		let spasing = 8;
		let shift = 0;
		
		let root;
		let size;
		
		let selectedTech = this.techList[civCode][this.selectedTech];
		let selectedTemplate = this.parsedData.techs[civCode][this.selectedTech];
		
		let pSelectedTech;
		let pSelectedTemplate;
		
		Engine.GetGUIObjectByName("req_caption").caption = "Requirements";
		Engine.GetGUIObjectByName("unlock_caption").caption = "Unlocks Technologies";
		Engine.GetGUIObjectByName("unlock_unit_caption").caption = "Unlocks Units";
		
		if (selectedTemplate) {
			if (selectedTemplate.paired) {
				pSelectedTech = this.techList[civCode][selectedTemplate.paired];
				pSelectedTemplate = this.parsedData.techs[civCode][selectedTemplate.paired];
			}
		}
		
		// Draw buildings
		shift = 0;
		for (let sc in this.startingTechs[civCode])
			shift++;
		shift = shift/2;
		for (let sc in this.startingTechs[civCode])
		{
			let thisEle = Engine.GetGUIObjectByName("struct["+i+"]_icon");
			if (thisEle === undefined)
			{
				error("\""+civCode+"\" has more starting buildings than can be supported by the current GUI layout");
				break;
			}
			// Set start tech icon
			let phaseSize = thisEle.size;
			phaseSize.left = (initIconSize.right)*(i-shift) + 4;
			phaseSize.right = (initIconSize.right)*(i+1-shift);
			phaseSize.bottom = (initIconSize.bottom)- (row*rowSize) + spasing;
			phaseSize.top = (initIconSize.top) - (row*rowSize) + spasing;
			thisEle.size = phaseSize;
			thisEle.hidden = false;
			++i;
		}
		Engine.GetGUIObjectByName("struct_row").size = "0 0 100% "+(initIconSize.bottom-(row*rowSize) + 2*spasing);
		for (let x = i; x < 30; ++x) {
			Engine.GetGUIObjectByName("struct["+x+"]_icon").hidden = true;
		}
		row++;
		i = 0;
		// Draw starting technlogies
		if (this.startingTechs[civCode][this.selectedBuilding]) {
			shift = this.startingTechs[civCode][this.selectedBuilding].length/2;
			for (let tech of this.startingTechs[civCode][this.selectedBuilding])
			{
				let thisEle = Engine.GetGUIObjectByName("tech["+i+"]_icon");
				if (thisEle === undefined)
				{
					error("\""+civCode+"\" has more starting techs than can be supported by the current GUI layout");
					break;
				}
				// Align the phase row
				Engine.GetGUIObjectByName("tech["+i+"]_icon").hidden = false;
				// Set start tech icon
				let phaseIcon = Engine.GetGUIObjectByName("tech["+i+"]_icon");
				let phaseSize = phaseIcon.size;
				phaseSize.left = (initIconSize.right)*(i-shift) + 4;
				phaseSize.right = (initIconSize.right)*(i+1-shift);
				phaseSize.bottom = (initIconSize.bottom) - ((row-1)*rowSize) + spasing;
				phaseSize.top = (initIconSize.top) - ((row-1)*rowSize) + spasing;
				phaseIcon.size = phaseSize;
				++i;
			}
		}
		for (let x = i; x < 30; ++x) {
			Engine.GetGUIObjectByName("tech["+x+"]_icon").hidden = true;
		}
		Engine.GetGUIObjectByName("start_row").size = "0 "+((initIconSize.top) - (row*rowSize) + 2*spasing)+" 100% "+(initIconSize.bottom-(row*rowSize) + 4*spasing);
		
		let leftRows = row+2;
		row = 0;
		spasing = 0;
		
		root = Engine.GetGUIObjectByName("tSection");
		root.size =  "30% "+((initIconSize.top) - (leftRows*rowSize))+" 70% 98%";

		root = Engine.GetGUIObjectByName("sSection");
		root.size = "0 "+((initIconSize.top) - (leftRows*rowSize))+" 30% 98%";
		root = Engine.GetGUIObjectByName("sGenericName");
		root.hidden = true;
		if (selectedTemplate) {
			root.caption = selectedTemplate.name.generic;
			root.hidden = false;
		}
		root = Engine.GetGUIObjectByName("sIcon");
		root.hidden = true;
		if (selectedTemplate) {
			root.sprite = "stretched:session/portraits/"+selectedTemplate.icon;
			root.hidden = false;
		}
		root = Engine.GetGUIObjectByName("sDescription");
		root.hidden = true;
		if (selectedTemplate) {
			if (selectedTemplate.tooltip)
				root.caption = selectedTemplate.tooltip;
			else
				root.caption = selectedTemplate.description;
			root.hidden = false;
		}
		root = Engine.GetGUIObjectByName("sPhase");
		if (selectedTech && selectedTech.phase) {
			root.hidden = false;
			root = Engine.GetGUIObjectByName("sPhaseGenericName");
			root.caption = this.parsedData.phases[selectedTech.phase].name.generic;
			root.hidden = false;
			root = Engine.GetGUIObjectByName("sPhaseIcon");
			root.sprite = "stretched:session/portraits/"+this.parsedData.phases[selectedTech.phase].icon;
			root.hidden = false;
		} else {
			root.hidden = true;
			Engine.GetGUIObjectByName("sPhaseGenericName").hidden = true;
			Engine.GetGUIObjectByName("sPhaseIcon").hidden = true;
		}
		root = Engine.GetGUIObjectByName("sCost");
		let caption = "";
		let cc = 0;
		root.hidden = true;
		if (selectedTemplate) {
			for (let key in selectedTemplate.cost) {
				if (selectedTemplate.cost[key]){
					caption =  caption + '[icon="icon_'+ key +'"] ' + selectedTemplate.cost[key] +" ";
					cc++;
				}
			}
			if (!cc)
				caption = "Cost free";
			root.caption = caption;
			root.hidden = false;
		}
			
		// Paired
		if (pSelectedTemplate) {
			root = Engine.GetGUIObjectByName("pSection");
			root.size =  "70% "+((initIconSize.top) - (leftRows*rowSize))+" 100% 98%";
			root.hidden = false;
			root = Engine.GetGUIObjectByName("pGenericName");
			root.caption = pSelectedTemplate.name.generic;
			root.hidden = false;
			root = Engine.GetGUIObjectByName("pIcon");
			root.sprite = "stretched:session/portraits/"+pSelectedTemplate.icon;
			root.hidden = false;
			root = Engine.GetGUIObjectByName("pDescription");
			if (pSelectedTemplate.tooltip)
				root.caption = pSelectedTemplate.tooltip;
			else
				root.caption = pSelectedTemplate.description;
			root.hidden = false;
			
			root = Engine.GetGUIObjectByName("pPhase");
			if (pSelectedTech && pSelectedTech.phase) {
				root.hidden = false;
				root = Engine.GetGUIObjectByName("pPhaseGenericName");
				root.caption = this.parsedData.phases[pSelectedTech.phase].name.generic;
				root.hidden = false;
				root = Engine.GetGUIObjectByName("pPhaseIcon");
				root.sprite = "stretched:session/portraits/"+this.parsedData.phases[pSelectedTech.phase].icon;
				root.hidden = false;
			} else {
				root.hidden = true;
				Engine.GetGUIObjectByName("pPhaseGenericName").hidden = true;
				Engine.GetGUIObjectByName("pPhaseIcon").hidden = true;
			}
			
			root = Engine.GetGUIObjectByName("pCost");
			caption = "";
			cc = 0;
			for (let key in pSelectedTemplate.cost) {
				if (pSelectedTemplate.cost[key]) {
					caption =  caption + '[icon="icon_'+ key +'"] ' + pSelectedTemplate.cost[key] +" ";
					cc++;
				}
			}
			if (!cc)
				caption = "Cost free";
			root.caption = caption;
			root.hidden = false;
		} else {
			Engine.GetGUIObjectByName("pSection").hidden = true;
			Engine.GetGUIObjectByName("pGenericName").hidden = true;
			Engine.GetGUIObjectByName("pIcon").hidden = true;
			Engine.GetGUIObjectByName("pDescription").hidden = true;
			Engine.GetGUIObjectByName("pCost").hidden = true;
		}
		row += 2;
		i = 0;
		root = Engine.GetGUIObjectByName("req_caption");
		size = root.size;
		size.bottom = (initIconSize.bottom) - row*rowSize + spasing;
		size.top =  (initIconSize.top) - row*rowSize + spasing;
		spasing += ((size.bottom - size.top)/2);
		root.size = size;
		let b = 0;
		// Draw req
		if (selectedTech) {
			let sb = selectedTech.buildings.length > 0 ? 1 : 0;
			shift = (sb + selectedTech.require.length)/2;
			for (let struct of selectedTech.buildings) {
				let thisEle = Engine.GetGUIObjectByName("req_struct");
				let phaseSize = thisEle.size;
				phaseSize.left = (initIconSize.right)*(i-shift) + 4;
				phaseSize.right = (initIconSize.right)*(i-shift+1);
				phaseSize.bottom = (initIconSize.bottom)- (row*rowSize) + spasing;
				phaseSize.top = (initIconSize.top) - (row*rowSize) + spasing;
				thisEle.size = phaseSize;
				thisEle.hidden = false;
				b++;
				break;
			}
			for (let tech of selectedTech.require) {
				let thisEle = Engine.GetGUIObjectByName("req["+i+"]_icon");
				if (thisEle === undefined)
				{
					error("\""+civCode+"\" has more starting techs than can be supported by the current GUI layout");
					break;
				}
				// Set start tech icon
				let phaseSize = thisEle.size;
				phaseSize.left = (initIconSize.right)*(i+1-shift) + 4;
				phaseSize.right = (initIconSize.right)*(i+2-shift);
				phaseSize.bottom = (initIconSize.bottom)- (row*rowSize) + spasing;
				phaseSize.top = (initIconSize.top) - (row*rowSize) + spasing;
				thisEle.size = phaseSize;
				thisEle.hidden = false;
				++i;
			}
		}
		for (let x = i; x < 30; ++x) {
			Engine.GetGUIObjectByName("req["+x+"]_icon").hidden = true;
		}
		if (!b) {
			Engine.GetGUIObjectByName("req_struct").hidden = true;
		}
		row++;
		
		root = Engine.GetGUIObjectByName("pair_caption");
		size = root.size;
		size.left = 2.5*(initIconSize.right);
		size.right = 2.5*(initIconSize.right)+50;
		size.bottom = (initIconSize.bottom) - row*rowSize + spasing;
		size.top =  (initIconSize.top) - row*rowSize + spasing;
		root.size = size;
		
		root = Engine.GetGUIObjectByName("root_caption");
		size = root.size;
		size.left = -100;
		size.right = 100;
		size.bottom = (initIconSize.bottom) - row*rowSize + spasing;
		size.top =  (initIconSize.top) - row*rowSize + spasing;
		spasing += ((size.bottom - size.top)/1.5);
		root.size = size;
		root.hidden = false;
		
		// Draw root of tree
		root = Engine.GetGUIObjectByName("root");
		size = root.size;
		size.left = -0.5*initIconSize.right;
		size.right = 0.5*(initIconSize.right);
		size.bottom = initIconSize.bottom - (row*rowSize) + spasing;
		size.top = initIconSize.top - (row*rowSize) + spasing;
		root.size = size;
		root.hidden = false;
		
		// Draw pair of tree
		root = Engine.GetGUIObjectByName("pair");
		size = root.size;
		size.left = 2.5*(initIconSize.right);
		size.right = 3.5*(initIconSize.right);
		size.bottom = initIconSize.bottom - (row*rowSize) + spasing;
		size.top = initIconSize.top - (row*rowSize) + spasing;
		root.size = size;
		root.hidden = true;
		
		row++;
		i = 0;
		root = Engine.GetGUIObjectByName("unlock_caption");
		size = root.size;
		size.bottom = (initIconSize.bottom) - row*rowSize + spasing;
		size.top =  (initIconSize.top) - row*rowSize + spasing;
		spasing += ((size.bottom - size.top)/2);
		root.size = size;
		// Draw unlocks
		if (selectedTech) {
			shift = selectedTech.unlocks.length/2;
			for (let tech of selectedTech.unlocks) {
				let thisEle = Engine.GetGUIObjectByName("unlock["+i+"]_icon");
				if (thisEle === undefined)
				{
					error("\""+civCode+"\" has more starting techs than can be supported by the current GUI layout");
					break;
				}
				// Set start tech icon
				let phaseSize = thisEle.size;
				phaseSize.left = (initIconSize.right)*(i-shift)+4;
				phaseSize.right = (initIconSize.right)*(i+1-shift);
				phaseSize.bottom = (initIconSize.bottom)- (row*rowSize) + spasing;
				phaseSize.top = (initIconSize.top) - (row*rowSize) + spasing;
				thisEle.size = phaseSize;
				thisEle.hidden = false;
				++i;
			}
			if (i)
				row++;
		}
		for (let x = i; x < 30; ++x) {
			Engine.GetGUIObjectByName("unlock["+x+"]_icon").hidden = true;
		}
		i=0;
		root = Engine.GetGUIObjectByName("unlock_unit_caption");
		size = root.size;
		size.bottom = (initIconSize.bottom) - row*rowSize + spasing;
		size.top =  (initIconSize.top) - row*rowSize + spasing;
		spasing += ((size.bottom - size.top)/2);
		root.size = size;
		if (selectedTech) {
			shift = selectedTech.units.length/2;
			for (let tech of selectedTech.units) {
				let thisEle = Engine.GetGUIObjectByName("unlock_unit["+i+"]_icon");
				if (thisEle === undefined)
				{
					error("\""+civCode+"\" has more starting techs than can be supported by the current GUI layout");
					break;
				}
				// Set start tech icon
				let phaseSize = thisEle.size;
				phaseSize.left = (initIconSize.right)*(i-shift)+4;
				phaseSize.right = (initIconSize.right)*(i+1-shift);
				phaseSize.bottom = (initIconSize.bottom)- (row*rowSize) + spasing;
				phaseSize.top = (initIconSize.top) - (row*rowSize) + spasing;
				thisEle.size = phaseSize;
				thisEle.hidden = false;
				++i;
			}
		}
		for (let x = i; x < 30; ++x) {
			Engine.GetGUIObjectByName("unlock_unit["+x+"]_icon").hidden = true;
		}
	//	hideRemaining("phase_rows", i);
	}

	deriveModifications(techList, civCode)
	{
		let techData = [];
		for (let techName of techList)
			techData.push(GetTechnologyBasicDataHelper(this.loadTechData(techName), civCode));

		return DeriveModificationsFromTechnologies(techData);
	}

	/**
	 * Determines and returns the phase in which a given technology can be
	 * first researched. Works recursively through the given tech's
	 * pre-requisite and superseded techs if necessary.
	 *
	 * @param {string} techName - The Technology's name
	 * @return The name of the phase the technology belongs to, or false if
	 *         the current civ can't research this tech
	 */
	getPhaseOfTechnology(techName, civCode)
	{
		let phaseIdx = -1;

		if (basename(techName).startsWith("phase"))
		{
			if (!this.parsedData.phases[techName].reqs)
				return false;

			phaseIdx = this.parsedData.phaseList.indexOf(this.getActualPhase(techName));
			if (phaseIdx > 0)
				return this.parsedData.phaseList[phaseIdx - 1];
		}

		if (!this.parsedData.techs[civCode][techName])
		{
			let techData = this.loadTechnology(techName, civCode);
			this.parsedData.techs[civCode][techName] = techData;
			warn("The \"" + techName + "\" technology is not researchable in any structure buildable by the " +
				civCode + " civilisation, but is required by something that this civ can research, train or build!");
		}

		let techReqs = this.parsedData.techs[civCode][techName].reqs;
		if (!techReqs)
			return false;

		for (let option of techReqs) {
			if (option.techs) {
				for (let tech of option.techs)
				{
					if (basename(tech).startsWith("phase"))
						return tech;
					if (basename(tech).startsWith("pair"))
						continue;
					phaseIdx = Math.max(phaseIdx, this.parsedData.phaseList.indexOf(this.getPhaseOfTechnology(tech, civCode)));
				}
			}
		}
		return this.parsedData.phaseList[phaseIdx] || false;
	}

	getTechSupersedes(techName, civCode)
	{
		if (basename(techName).startsWith("phase"))
		{
			if (!this.parsedData.phases[techName].superseded)
				return false;

			phaseIdx = this.parsedData.phaseList.indexOf(this.getActualPhase(techName));
			if (phaseIdx > 0)
				return this.parsedData.phaseList[phaseIdx - 1];
		}
		if (!this.parsedData.techs[civCode][techName])
		{
			let techData = this.loadTechnology(techName, civCode);
			this.parsedData.techs[civCode][techName] = techData;
			warn("The \"" + techName + "\" technology is not researchable in any structure buildable by the " +
				civCode + " civilisation, but is required by something that this civ can research, train or build!");
		}	
		let techReqs = this.parsedData.techs[civCode][techName].reqs;
		let supers = this.parsedData.techs[civCode][techName].supersedes;
		// Cannot research
		if (techReqs == false)
			return false;
		let req = [];
		if (supers) {
			if (!basename(supers).startsWith("phase") && !basename(supers).startsWith("pair"))
				req.push(supers);
		}
		for (let option of techReqs) {
			if (!!option.techs) {
				for (let tech of option.techs) {
					if (basename(tech).startsWith("phase"))
						continue;
					if (basename(tech).startsWith("pair"))
						continue;
					if (req.indexOf(tech) == -1)
						req.push(tech);
				}
			}
		}
		return req;
	}

	/**
	 * Returns the actual phase a certain phase tech represents or stands in for.
	 *
	 * For example, passing `phase_city_athen` would result in `phase_city`.
	 *
	 * @param {string} phaseName
	 * @return {string}
	 */
	getActualPhase(phaseName)
	{
		if (this.parsedData.phases[phaseName])
			return this.parsedData.phases[phaseName].actualPhase;

		warn("Unrecognised phase (" + phaseName + ")");
		return this.parsedData.phaseList[0];
	}

	/**
	 * Returns the required phase of a given unit or structure.
	 *
	 * @param {object} template
	 * @return {string}
	 */
	getPhaseOfTemplate(template, civCode)
	{
		if (!template.requiredTechnology)
			return this.parsedData.phaseList[0];

		if (basename(template.requiredTechnology).startsWith("phase"))
			return this.getActualPhase(template.requiredTechnology);

		return this.getPhaseOfTechnology(template.requiredTechnology, civCode);
	}
	/*********************************/
	/***********load.js**************/
	/********************************/
	/**
	 * Load and parse a structure, unit, resource, etc from its entity template file.
	 *
	 * @return {(object|null)} Sanitized object about the requested template or null if entity template doesn't exist.
	 */
	loadEntityTemplate(templateName, civCode, modifiers)
	{
		if (!Engine.TemplateExists(templateName))
			return null;

		let template = this.loadTemplate(templateName, civCode);
		let parsed = GetTemplateDataHelper(template, null, this.g_AuraData, this.g_ResourceData, modifiers);
		parsed.name.internal = templateName;

		parsed.history = template.Identity.History;

		parsed.production = this.loadProductionQueue(template, civCode);
		if (template.Builder)
			parsed.builder = this.loadBuildQueue(template, civCode);

		if (template.Identity.Rank)
			parsed.promotion = {
				"current_rank": template.Identity.Rank,
				"entity": template.Promotion && template.Promotion.Entity
			};

		if (template.ResourceSupply)
			parsed.supply = {
				"type": template.ResourceSupply.Type.split("."),
				"amount": template.ResourceSupply.Amount,
			};

		if (parsed.upgrades)
			parsed.upgrades = this.getActualUpgradeData(parsed.upgrades, civCode);

		if (parsed.wallSet)
		{
			parsed.wallset = {};

			if (!parsed.upgrades)
				parsed.upgrades = [];

			// Note: An assumption is made here that wall segments all have the same armor and auras
			let struct = this.loadEntityTemplate(parsed.wallSet.templates.long, civCode);
			parsed.armour = struct.armour;
			parsed.auras = struct.auras;

			// For technology cost multiplier, we need to use the tower
			struct = this.loadEntityTemplate(parsed.wallSet.templates.tower, civCode);
			parsed.techCostMultiplier = struct.techCostMultiplier;

			let health;

			for (let wSegm in parsed.wallSet.templates)
			{
				if (wSegm == "fort" || wSegm == "curves")
					continue;

				let wPart = this.loadEntityTemplate(parsed.wallSet.templates[wSegm], civCode);
				parsed.wallset[wSegm] = wPart;

				for (let research of wPart.production.techs)
					parsed.production.techs.push(research);

				if (wPart.upgrades)
					parsed.upgrades = parsed.upgrades.concat(wPart.upgrades);

				if (["gate", "tower"].indexOf(wSegm) != -1)
					continue;

				if (!health)
				{
					health = { "min": wPart.health, "max": wPart.health };
					continue;
				}

				health.min = Math.min(health.min, wPart.health);
				health.max = Math.max(health.max, wPart.health);
			}

			if (parsed.wallSet.templates.curves)
				for (let curve of parsed.wallSet.templates.curves)
				{
					let wPart = this.loadEntityTemplate(curve, civCode);
					health.min = Math.min(health.min, wPart.health);
					health.max = Math.max(health.max, wPart.health);
				}

			if (health.min == health.max)
				parsed.health = health.min;
			else
				parsed.health = sprintf(translate("%(health_min)s to %(health_max)s"), {
					"health_min": health.min,
					"health_max": health.max
				});
		}

		return parsed;
	}
	loadTechnology(techName, civCode)
	{
		if (civCode == undefined)
			error("loadTechnology("+techName + ", undefined)")
		let template = this.loadTechData(techName);
		let tech = GetTechnologyDataHelper(template, civCode, this.g_ResourceData);
		tech.name.internal = techName;
		tech.supersedes = template.supersedes;

		if (template.pair !== undefined)
		{
			tech.pair = template.pair;
			let pairInfo = this.loadTechnologyPair(template.pair, civCode);
			tech.paired = pairInfo.techs[0];
			if (techName == pairInfo.techs[0])
				tech.paired = pairInfo.techs[1];
			tech.reqs = this.mergeRequirements(tech.reqs, pairInfo.reqs);
		}

		return tech;
	}
	loadTechnologyPair(pairCode, civCode)
	{
		var pairInfo = this.loadTechData(pairCode);

		return {
			"techs": [ pairInfo.top, pairInfo.bottom ],
			"reqs": DeriveTechnologyRequirements(pairInfo, civCode)
		};
	}
	loadProductionQueue(template, civCode)
	{
		const production = {
			"techs": [],
			"units": []
		};

		if (!template.Researcher && !template.Trainer)
			return production;

		if (template.Trainer?.Entities?._string) {
			for (let templateName of template.Trainer.Entities._string.split(" ")) {
				templateName = templateName.replace(/\{(civ|native)\}/g, civCode);
				if (Engine.TemplateExists(templateName))
					production.units.push(templateName);
			}
		}

		const appendTechnology = (technologyName) => {
			const technology = this.loadTechnologyTemplate(technologyName, civCode);
			if (DeriveTechnologyRequirements(technology, civCode))
				production.techs.push(technologyName);
		};

		if (template.Researcher?.Technologies?._string) {
			for (let technologyName of template.Researcher.Technologies._string.split(" ")) {
				if (technologyName.indexOf("{civ}") != -1) {
					const civTechName = technologyName.replace("{civ}", civCode);
					technologyName = TechnologyTemplateExists(civTechName) ? civTechName : technologyName.replace("{civ}", "generic");
				}

				if (this.isPairTech(technologyName)) {
					let technologyPair = this.loadTechnologyPairTemplate(technologyName, civCode);
					if (technologyPair.reqs) {
						for (technologyName of technologyPair.techs)
							appendTechnology(technologyName);
					}
				}
				else {
					appendTechnology(technologyName);
				}
			}
		}
		return production;
	}
	loadTechnologyPairTemplate(templateName, civCode)
	{
		let template = this.loadTechnologyTemplate(templateName);
		return {
			"techs": [template.top, template.bottom],
			"reqs": DeriveTechnologyRequirements(template, civCode)
		};
	}
	loadBuildQueue(template, civCode)
	{
		let buildQueue = [];

		if (!template.Builder || !template.Builder.Entities._string)
			return buildQueue;

		for (let build of template.Builder.Entities._string.split(" "))
		{
			build = build.replace(/\{(civ|native)\}/g, civCode);
			if (Engine.TemplateExists(build))
				buildQueue.push(build);
		}

		return buildQueue;
	};
	getActualUpgradeData(upgradesInfo, selectedCiv)
	{
		let newUpgrades = [];
		for (let upgrade of upgradesInfo)
		{
			upgrade.entity = upgrade.entity.replace(/\{(civ|native)\}/g, selectedCiv);

			let data = GetTemplateDataHelper(this.loadTemplate(upgrade.entity, selectedCiv), null, this.g_AuraData, this.g_ResourceData);
			data.name.internal = upgrade.entity;
			data.cost = upgrade.cost;
			data.icon = upgrade.icon || data.icon;
			data.tooltip = upgrade.tooltip || data.tooltip;
			data.requiredTechnology = upgrade.requiredTechnology || data.requiredTechnology;

			newUpgrades.push(data);
		}
		return newUpgrades;
	}
	loadTechnologyTemplate(templateName)
	{
		let data = Engine.ReadJSONFile(this.g_TechnologyPath + templateName + ".json");
		translateObjectKeys(data, this.g_TechnologyTranslateKeys);

		// Translate specificName as in GetTechnologyData() from gui/session/session.js
		if (typeof (data.specificName) === 'object') {
			for (let civ in data.specificName) {
				data.specificName[civ] = translate(data.specificName[civ]);
			}
		} else if (data.specificName) {
			warn("specificName should be an object of civ->name mappings in " + templateName + ".json");
		}
		return data;
	}
	isPairTech(technologyCode)
	{
		return !!this.loadTechnologyTemplate(technologyCode).top;
	}
	loadTemplate(templateName, civCode)
	{
		if (!(templateName in this.g_TemplateData))
		{
			// We need to clone the template because we want to perform some translations.
			let data = clone(Engine.GetTemplate(templateName));
			translateObjectKeys(data, ["GenericName", "SpecificName", "Tooltip", "History"]);

			if (data.Auras)
				for (let auraID of data.Auras._string.split(/\s+/))
					this.loadAuraData(auraID);

			if (data.Identity.Civ != "gaia" && civCode != "gaia" && data.Identity.Civ != civCode)
				warn("The \"" + templateName + "\" template has a defined civ of \"" + data.Identity.Civ + "\". " +
					"This does not match the currently selected civ \"" + civCode + "\".");

			this.g_TemplateData[templateName] = data;
		}

		return this.g_TemplateData[templateName];
	}
	loadAuraData(templateName)
	{
		if (!(templateName in this.g_AuraData))
		{
			let data = Engine.ReadJSONFile(this.g_AuraPath + templateName + ".json");
			translateObjectKeys(data, ["auraName", "auraDescription"]);

			this.g_AuraData[templateName] = data;
		}

		return this.g_AuraData[templateName];
	}
	loadPhase(phaseCode, civCode)
	{
		let phase = this.loadTechnology(phaseCode, civCode);

		phase.actualPhase = phaseCode;
		if (phase.replaces !== undefined)
			phase.actualPhase = phase.replaces[0];

		return phase;
	}
	findAllAutoResearchedTechs()
	{
		let techList = [];

		for (let filename of Engine.ListDirectoryFiles(this.g_TechnologyPath, "*.json", true))
		{
			// -5 to strip off the file extension
			let templateName = filename.slice(this.g_TechnologyPath.length, -5);
			let data = this.loadTechData(templateName);

			if (data && data.autoResearch)
				techList.push(templateName);
		}

		return techList;
	}
	loadTechData(templateName)
	{
		if (!(templateName in this.g_TechnologyData))
		{
			let data = Engine.ReadJSONFile(this.g_TechnologyPath + templateName + ".json");
			translateObjectKeys(data, ["genericName", "tooltip", "description"]);

			this.g_TechnologyData[templateName] = data;
		}

		return this.g_TechnologyData[templateName];
	}
	mergeRequirements(reqsA, reqsB)
	{
		if (reqsA === false || reqsB === false)
			return false;

		let finalReqs = clone(reqsA);

		for (let option of reqsB) {
			for (let type in option) {
				for (let opt in finalReqs)
				{
					if (!finalReqs[opt][type])
						finalReqs[opt][type] = [];
					finalReqs[opt][type] = finalReqs[opt][type].concat(option[type]);
				}
			}
		}
		return finalReqs;
	}
}

TechtreePage.prototype.CloseButtonTooltip =
	translate("%(hotkey)s: Close Technology Tree.");

// Gap between the `TreeSection` and `TrainerSection` gui objects (when the latter is visible)
TechtreePage.prototype.SectionGap = 12;

// Margin around the edge of the structree on lower resolutions,
// preventing the UI from being clipped by the edges of the screen.
TechtreePage.prototype.BorderMargin = 16;