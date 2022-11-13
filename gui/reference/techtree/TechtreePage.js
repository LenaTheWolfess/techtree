/**
 * This class represents the Structure Tree GUI page.
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
		let closeButton = new CloseButton(this);
		Engine.SetGlobalHotkey("techtree", "Press", this.closePage.bind(this));

		this.TechtreePage.onWindowResized = this.updatePageWidth.bind(this);
		this.width = 0;
		
		/****OLD DATA***/
		this.g_ParsedData = {
			"units": {},
			"structures": {},
			"techs": {},
			"phases": {}
		};
		this.g_StructreeTooltipFunctions = [
			getEntityNamesFormatted,
			getEntityCostTooltip,
			getEntityTooltip,
			getAurasTooltip
		];
		/**
		 * Array of structure template names when given a civ and a phase name.
		 */
		this.g_TechList = {};
		this.g_StartingTechs = {};
		this.g_SelectedTech = "phase_village";
		this.g_SelectedBuilding = "structures";
		this.g_SelectedCiv;
		this.g_CivData = loadCivData(true, false);
		this.g_AutoResearchTechList = findAllAutoResearchedTechs();
		this.g_CurrentModifiers = {};
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
		this.CivHistory.caption = this.civData[this.activeCiv].History;

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
		if (this.g_TechList[this.g_SelectedCiv] && this.g_TechList[this.g_SelectedCiv][techCode]) {
			this.g_SelectedTech = techCode;
		}
	}

	selectStruct(structCode)
	{
		this.g_SelectedBuilding = structCode;
		this.g_SelectedTech = "";
		if (this.g_StartingTechs[this.g_SelectedCiv] && this.g_StartingTechs[this.g_SelectedCiv][this.g_SelectedBuilding]) {
			this.selectTech(this.g_StartingTechs[this.g_SelectedCiv][this.g_SelectedBuilding][0]);
		}
	}

	/**
	 * @param {string} civCode
	 */
	selectCivOld(civCode)
	{
		if (civCode === this.g_SelectedCiv || !this.g_CivData[civCode])
			return;

		this.g_SelectedCiv = civCode;

		this.g_CurrentModifiers = this.deriveModifications(this.g_AutoResearchTechList, this.g_SelectedCiv);

		// If a buildList already exists, then this civ has already been parsed
		if (this.g_TechList[this.g_SelectedCiv])
		{
			this.draw();
			return;
		}

		let templateLists = this.TemplateLister.getTemplateLists(this.activeCiv);

		for (let u of templateLists.units.keys())
			if (!this.g_ParsedData.units[u])
				this.g_ParsedData.units[u] = loadEntityTemplate(u, this.activeCiv, this.g_CurrentModifiers);

		
		for (let s of templateLists.structures.keys()) {
			if (!this.g_ParsedData.structures[s])
				this.g_ParsedData.structures[s] = loadEntityTemplate(s, this.activeCiv, this.g_CurrentModifiers);
		}

		// Load technologies
		this.g_ParsedData.techs[civCode] = {};
		for (let techcode of templateLists.techs.keys())
			if (basename(techcode).startsWith("phase"))
				this.g_ParsedData.phases[techcode] = loadPhase(techcode, this.activeCiv);
			else
				this.g_ParsedData.techs[civCode][techcode] = loadTechnology(techcode, this.activeCiv);

		// Establish phase order
		this.g_ParsedData.phaseList = UnravelPhases(this.g_ParsedData.phases);

		// Load any required generic phases that aren't already loaded
		for (let phasecode of this.g_ParsedData.phaseList)
			if (!this.g_ParsedData.phases[phasecode])
				this.g_ParsedData.phases[phasecode] = loadPhase(phasecode, this.activeCiv);

		let techList = {};
		let startList = {};
		// Get all technologies for selected civ
		for (let structCode of templateLists.structures.keys())
		{
			let structInfo = this.g_ParsedData.structures[structCode];
			// Add technologies
			for (let prod of structInfo.production.techs)
			{
				if (basename(prod).startsWith("phase"))
					continue;
				let same = false;
				if (!(prod in techList)) {
					techList[prod] = {"require": [], "unlocks": [], "buildings": [], "units": [], "phase": this.getPhaseOfTemplate(structInfo)};
				}
				let reqs = this.GetTechSupersedes(prod);
				if (reqs === false)
					continue;
				let pName = this.getPhaseOfTemplate(structInfo);
				let ptName = this.getPhaseOfTechnology(prod);
				let pId =  this.g_ParsedData.phaseList.indexOf(pName);
				// loop through all buildings and return minimum phase
				for (let b of techList[prod].buildings) {
					let bs = this.g_ParsedData.structures[b];
					pId = Math.min(pId, this.g_ParsedData.phaseList.indexOf(this.getPhaseOfTemplate(bs)));
				}
				pId = Math.max(pId, this.g_ParsedData.phaseList.indexOf(ptName));
				techList[prod].phase = this.g_ParsedData.phaseList[pId];
			//	warn(prod + " " + "(" + pId + ") "  + techList[prod].phase + " phase of template " + this.g_ParsedData.phaseList.indexOf(pName) );
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
					this.g_SelectedBuilding = structCode;
					this.g_SelectedTech = prod;
				}
			}
			// Add units to technologies
			for (let prod of structInfo.production.units)
			{
				let template = this.g_ParsedData.units[prod];
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
		
		this.g_TechList[this.g_SelectedCiv] = techList;
		this.g_StartingTechs[this.g_SelectedCiv] = startList;
		this.selectStruct(Object.keys(startList)[0]);
		this.draw();
	}

	/**** OLD DRAW CODE ****/
	/**
	 * Functions used to collate the contents of a tooltip.
	 */
	 
	
	/**
	 * Draw the techtree
	 *
	 * (Actually resizes and changes visibility of elements, and populates text)
	 */
	draw()
	{
		// Set basic state (positioning of elements mainly), but only once
		//if (!Object.keys(this.g_DrawLimits).length)
			this.predraw();

		let leftMargin = Engine.GetGUIObjectByName("tree_display").size.left;

		let phaseList = this.g_ParsedData.phaseList;

		Engine.GetGUIObjectByName("civEmblem").sprite = "stretched:" + this.g_CivData[this.g_SelectedCiv].Emblem;
		Engine.GetGUIObjectByName("civName").caption = this.g_CivData[this.g_SelectedCiv].Name;
		Engine.GetGUIObjectByName("civHistory").caption = this.g_CivData[this.g_SelectedCiv].History;Engine.GetGUIObjectByName("root_caption").caption = "";
		Engine.GetGUIObjectByName("pair_caption").caption = "";
		
		let i = 0;
		for (let sc in this.g_StartingTechs[this.g_SelectedCiv])
		{
			let structCode = sc;
			let thisEle = Engine.GetGUIObjectByName("struct["+i+"]_icon");
			if (thisEle === undefined)
			{
				error("\""+this.g_SelectedCiv+"\" has more starting buildings than can be supported by the current GUI layout");
				break;
			}
			let struct = this.g_ParsedData.structures[structCode];
			if (!struct) {
				warn("structure " + structCode + " is not in parsed data");
				continue;
			}
			let grayscale = this.g_SelectedBuilding == sc ? "" : "grayscale:";
			thisEle.sprite = "stretched:"+grayscale+"session/portraits/"+struct.icon;
			thisEle.tooltip =  '[font="sans-bold-16"]' + struct.name.generic + '[/font]\n(' + struct.name.specific+")";
			let that = this;
			thisEle.onPress = function() {
				that.selectStruct(structCode);
				that.draw();
			}
			++i;
		}
		i = 0;
		if (this.g_StartingTechs[this.g_SelectedCiv] && this.g_StartingTechs[this.g_SelectedCiv][this.g_SelectedBuilding])
		{
			for (let techCode of this.g_StartingTechs[this.g_SelectedCiv][this.g_SelectedBuilding])
			{
				let thisEle = Engine.GetGUIObjectByName("tech["+i+"]_icon");
				if (thisEle === undefined)
				{
					error("\""+this.g_SelectedCiv+"\" has more starting techs than can be supported by the current GUI layout");
					break;
				}
				let tech = this.g_ParsedData.techs[this.g_SelectedCiv][techCode];
				if (techCode.startsWith("phase")) {
					tech = this.g_ParsedData.phases[techCode];
				}
				let startTechIcon = Engine.GetGUIObjectByName("tech["+i+"]_icon");
				
				let grayscale = this.g_SelectedTech == techCode ? "" : "grayscale:";
				startTechIcon.sprite = "stretched:"+grayscale+"session/portraits/"+tech.icon;
				startTechIcon.tooltip = '[font="sans-bold-16"]' + tech.name.generic+ '[/font]\n'+ tech.description;
				let that = this;
				startTechIcon.onPress = function() {
					that.selectTech(tech.name.internal);
					that.draw();
				}
				++i;
		}
		}
		// Draw requirements
		i = 0;
		if (this.g_TechList[this.g_SelectedCiv][this.g_SelectedTech]) {
			for (let struct of this.g_TechList[this.g_SelectedCiv][this.g_SelectedTech].buildings)
			{
				let thisEle = Engine.GetGUIObjectByName("req_struct");
				if (thisEle === undefined)
				{
					error("\""+this.g_SelectedCiv+"\" has more techs in phase " +
						  pha + " than can be supported by the current GUI layout");
					break;
				}
				let child = this.g_ParsedData.structures[struct];
				
				thisEle.sprite =	"stretched:session/portraits/"+child.icon;
				thisEle.tooltip = '[font="sans-bold-16"]' + child.name.generic + '[/font]\n(' + child.name.specific+")";
				let that = this;
				thisEle.onPress = function() {
					that.selectStruct(struct);
					that.draw();
				}
				thisEle.hidden = false;
				break;
			}
			for (let tech of this.g_TechList[this.g_SelectedCiv][this.g_SelectedTech].require)
			{
				let thisEle = Engine.GetGUIObjectByName("req["+i+"]_icon");
				if (thisEle === undefined)
				{
					error("\""+this.g_SelectedCiv+"\" has more techs in phase " +
						  pha + " than can be supported by the current GUI layout");
					break;
				}
				let child = this.g_ParsedData.techs[this.g_SelectedCiv][tech];
				if (!child) {
					warn("Technology not parsed for " + tech);
					continue;
				}
				thisEle.sprite =	"stretched:session/portraits/"+child.icon;
				thisEle.tooltip = '[font="sans-bold-16"]' +  child.name.generic + '[/font]\n' + child.description;
				let that = this;
				thisEle.onPress = function() {
					that.selectTech(child.name.internal);
					that.draw();
				}
				thisEle.hidden = false;

				++i;
			}
		}
		
		let rootIcon = Engine.GetGUIObjectByName("root");
		let pairIcon = Engine.GetGUIObjectByName("pair");
		let rootTech = this.g_ParsedData.techs[this.g_SelectedCiv][this.g_SelectedTech];

		if (rootTech) {
			let pairedTech;
			let pair = rootTech.paired;
			if (pair)
				pairedTech = this.g_ParsedData.techs[this.g_SelectedCiv][pair];
			pairIcon.hidden = true;
			if (pairedTech) {
				pairIcon.sprite = "stretched:session/portraits/"+pairedTech.icon;
				pairIcon.tooltip = '[font="sans-bold-16"]' + pairedTech.name.generic + '[/font]\n' + pairedTech.description;
				Engine.GetGUIObjectByName("pair_caption").caption = "Paired with";
				let that = this;
				pairIcon.onPress = function() {
					that.selectTech(pairedTech.name.internal);
					that.draw();
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
		if (this.g_TechList[this.g_SelectedCiv][this.g_SelectedTech]) {
			i = 0;	
			Engine.GetGUIObjectByName("unlock_caption").hidden = !this.g_TechList[this.g_SelectedCiv][this.g_SelectedTech].unlocks.length;
			for (let tech of this.g_TechList[this.g_SelectedCiv][this.g_SelectedTech].unlocks)
			{
				let thisEle = Engine.GetGUIObjectByName("unlock["+i+"]_icon");
				if (thisEle === undefined)
				{
					error("\""+this.g_SelectedCiv+"\" has more techs in phase " +
						  pha + " than can be supported by the current GUI layout");
					break;
				}
				let child = this.g_ParsedData.techs[this.g_SelectedCiv][tech];
				
				thisEle.sprite =	"stretched:session/portraits/"+child.icon;
				thisEle.tooltip = '[font="sans-bold-16"]' +  child.name.generic + '[/font]\n' + child.description;
				let that = this;
				thisEle.onPress = function() {
					that.selectTech(child.name.internal);
					that.draw();
				}
				thisEle.hidden = false;

				++i;
			}
			i = 0;
			Engine.GetGUIObjectByName("unlock_unit_caption").hidden = !this.g_TechList[this.g_SelectedCiv][this.g_SelectedTech].units.length;
			for (let unit of this.g_TechList[this.g_SelectedCiv][this.g_SelectedTech].units)
			{
				let thisEle = Engine.GetGUIObjectByName("unlock_unit["+i+"]_icon");
				if (thisEle === undefined)
				{
					error("\""+this.g_SelectedCiv+"\" has more techs in phase " +
						  pha + " than can be supported by the current GUI layout");
					break;
				}
				let child = this.g_ParsedData.units[unit];
				
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

	compileTooltip(template)
	{
		return buildText(template, this.g_StructreeTooltipFunctions) + "\n" + showTemplateViewerOnClickTooltip();
	}


	/**
	 * Positions certain elements that only need to be positioned once
	 * (as <repeat> does not position automatically).
	 *
	 * Also detects limits on what the GUI can display by iterating through the set
	 * elements of the GUI. These limits are then used by draw().
	 */
	predraw()
	{
		let phaseList = this.g_ParsedData.phaseList;
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
		
		let selectedTech = this.g_TechList[this.g_SelectedCiv][this.g_SelectedTech];
		let selectedTemplate = this.g_ParsedData.techs[this.g_SelectedCiv][this.g_SelectedTech];
		
		let pSelectedTech;
		let pSelectedTemplate;
		
		Engine.GetGUIObjectByName("req_caption").caption = "Requirements";
		Engine.GetGUIObjectByName("unlock_caption").caption = "Unlocks Technologies";
		Engine.GetGUIObjectByName("unlock_unit_caption").caption = "Unlocks Units";
		
		if (selectedTemplate) {
			if (selectedTemplate.paired) {
				pSelectedTech = this.g_TechList[this.g_SelectedCiv][selectedTemplate.paired];
				pSelectedTemplate = this.g_ParsedData.techs[this.g_SelectedCiv][selectedTemplate.paired];
			}
		}
		
		// Draw buildings
		shift = 0;
		for (let sc in this.g_StartingTechs[this.g_SelectedCiv])
			shift++;
		shift = shift/2;
		for (let sc in this.g_StartingTechs[this.g_SelectedCiv])
		{
			let thisEle = Engine.GetGUIObjectByName("struct["+i+"]_icon");
			if (thisEle === undefined)
			{
				error("\""+this.g_SelectedCiv+"\" has more starting buildings than can be supported by the current GUI layout");
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
		if (this.g_StartingTechs[this.g_SelectedCiv][this.g_SelectedBuilding]) {
			shift = this.g_StartingTechs[this.g_SelectedCiv][this.g_SelectedBuilding].length/2;
			for (let tech of this.g_StartingTechs[this.g_SelectedCiv][this.g_SelectedBuilding])
			{
				let thisEle = Engine.GetGUIObjectByName("tech["+i+"]_icon");
				if (thisEle === undefined)
				{
					error("\""+this.g_SelectedCiv+"\" has more starting techs than can be supported by the current GUI layout");
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
			root.caption = this.g_ParsedData.phases[selectedTech.phase].name.generic;
			root.hidden = false;
			root = Engine.GetGUIObjectByName("sPhaseIcon");
			root.sprite = "stretched:session/portraits/"+this.g_ParsedData.phases[selectedTech.phase].icon;
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
				root.caption = this.g_ParsedData.phases[pSelectedTech.phase].name.generic;
				root.hidden = false;
				root = Engine.GetGUIObjectByName("pPhaseIcon");
				root.sprite = "stretched:session/portraits/"+this.g_ParsedData.phases[pSelectedTech.phase].icon;
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
					error("\""+this.g_SelectedCiv+"\" has more starting techs than can be supported by the current GUI layout");
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
					error("\""+this.g_SelectedCiv+"\" has more starting techs than can be supported by the current GUI layout");
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
					error("\""+this.g_SelectedCiv+"\" has more starting techs than can be supported by the current GUI layout");
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

	deriveModifications(techList)
	{
		let techData = [];
		for (let techName of techList)
			techData.push(GetTechnologyBasicDataHelper(loadTechData(techName), this.g_SelectedCiv));

		return DeriveModificationsFromTechnologies(techData);
	}

	/**
	 * Provided with an array containing basic information about possible
	 * upgrades, such as that generated by globalscript's GetTemplateDataHelper,
	 * this function loads the actual template data of the upgrades, overwrites
	 * certain values within, then passes an array containing the template data
	 * back to caller.
	 */
	getActualUpgradeData(upgradesInfo)
	{
		let newUpgrades = [];
		for (let upgrade of upgradesInfo)
		{
			upgrade.entity = upgrade.entity.replace(/\{(civ|native)\}/g, this.g_SelectedCiv);

			let data = GetTemplateDataHelper(loadTemplate(upgrade.entity, this.activeCiv), null, this.g_AuraData, this.g_ResourceData);
			data.name.internal = upgrade.entity;
			data.cost = upgrade.cost;
			data.icon = upgrade.icon || data.icon;
			data.tooltip = upgrade.tooltip || data.tooltip;
			data.requiredTechnology = upgrade.requiredTechnology || data.requiredTechnology;

			newUpgrades.push(data);
		}
		return newUpgrades;
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
	getPhaseOfTechnology(techName)
	{
		let phaseIdx = -1;

		if (basename(techName).startsWith("phase"))
		{
			if (!this.g_ParsedData.phases[techName].reqs)
				return false;

			phaseIdx = this.g_ParsedData.phaseList.indexOf(this.getActualPhase(techName));
			if (phaseIdx > 0)
				return this.g_ParsedData.phaseList[phaseIdx - 1];
		}

		if (!this.g_ParsedData.techs[this.g_SelectedCiv][techName])
		{
			let techData = loadTechnology(techName, this.activeCiv);
			this.g_ParsedData.techs[this.g_SelectedCiv][techName] = techData;
			warn("The \"" + techName + "\" technology is not researchable in any structure buildable by the " +
				this.g_SelectedCiv + " civilisation, but is required by something that this civ can research, train or build!");
		}

		let techReqs = this.g_ParsedData.techs[this.g_SelectedCiv][techName].reqs;
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
					phaseIdx = Math.max(phaseIdx, this.g_ParsedData.phaseList.indexOf(this.getPhaseOfTechnology(tech)));
				}
			}
		}
		return this.g_ParsedData.phaseList[phaseIdx] || false;
	}

	GetTechSupersedes(techName)
	{
		if (basename(techName).startsWith("phase"))
		{
			if (!this.g_ParsedData.phases[techName].superseded)
				return false;

			phaseIdx = this.g_ParsedData.phaseList.indexOf(this.getActualPhase(techName));
			if (phaseIdx > 0)
				return this.g_ParsedData.phaseList[phaseIdx - 1];
		}
		if (!this.g_ParsedData.techs[this.g_SelectedCiv][techName])
		{
			let techData = loadTechnology(techName, this.activeCiv);
			this.g_ParsedData.techs[this.g_SelectedCiv][techName] = techData;
			warn("The \"" + techName + "\" technology is not researchable in any structure buildable by the " +
				this.g_SelectedCiv + " civilisation, but is required by something that this civ can research, train or build!");
		}	
		let techReqs = this.g_ParsedData.techs[this.g_SelectedCiv][techName].reqs;
		let supers = this.g_ParsedData.techs[this.g_SelectedCiv][techName].supersedes;
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
		if (this.g_ParsedData.phases[phaseName])
			return this.g_ParsedData.phases[phaseName].actualPhase;

		warn("Unrecognised phase (" + phaseName + ")");
		return this.g_ParsedData.phaseList[0];
	}

	/**
	 * Returns the required phase of a given unit or structure.
	 *
	 * @param {object} template
	 * @return {string}
	 */
	getPhaseOfTemplate(template)
	{
		if (!template.requiredTechnology)
			return this.g_ParsedData.phaseList[0];

		if (basename(template.requiredTechnology).startsWith("phase"))
			return this.getActualPhase(template.requiredTechnology);

		return this.getPhaseOfTechnology(template.requiredTechnology);
	}

	/**
	 * This is needed because getEntityCostTooltip in tooltip.js needs to get
	 * the template data of the different wallSet pieces. In the session this
	 * function does some caching, but here we do that in loadTemplate already.
	 */
	GetTemplateData(templateName)
	{
		var template = loadTemplate(templateName, this.activeCiv);
		return GetTemplateDataHelper(template, null, this.g_AuraData, this.g_ResourceData, this.g_CurrentModifiers);
	}

	isPairTech(technologyCode)
	{
		return !!loadTechData(technologyCode).top;
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