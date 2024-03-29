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
				
		this.Utils = new TechtreeUtils();
		this.scale = this.Utils.scale;
		
		this.civSelection = new CivSelectDropdown(this.civData);
		this.structRow = new StructRow();
	//	this.techRow = new TechRow();
		this.techSection = new TechSection();
		this.unlockSection = new UnlockSection();
		this.reqSection = new ReqSection();
		this.mainSection = new MainSection();
		this.listSection = new TechList(this);
		
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
			"phases": {},
			"replacing": {}
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
		
		this.resourceData = new Resources();
		
		this.auraData = {};
		this.templateData = {};
		this.technologyData = {};
		
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
			let civCode = this.selectedCiv;
			this.listSection.draw(this, civCode, this.startingTechs[civCode], this.selectedBuilding, this.parsedData, this.selectedTech);
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

		// If a buildList already exists, then this civ has already been parsed
		if (!this.techList[civCode])
			this.parseCiv(civCode);
		
		this.listSection.draw(this, civCode, this.startingTechs[civCode], this.selectedBuilding, this.parsedData, this.selectedTech);
		this.draw(civCode);
	}
	
	parseCiv(civCode)
	{
		let templateLists = this.TemplateLister.getTemplateLists(civCode);

		this.currentModifiers = this.deriveModifications(this.autoResearchTechList, civCode);
		this.parsedData.units = this.loadEntityData(templateLists.units.keys(), this.parsedData.units, civCode, this.currentModifiers);
		this.parsedData.structures = this.loadEntityData(templateLists.structures.keys(), this.parsedData.structures, civCode, this.currentModifiers);
		this.parsedData = this.loadTechnologies(templateLists.techs.keys(), this.parsedData, civCode);
				
		// Establish phase order
		this.parsedData.phaseList = UnravelPhases(this.parsedData.phases);
		const phaseList = this.parsedData.phaseList;
		// Load any required generic phases that aren't already loaded
		this.parsedData.phases = this.loadPhases(phaseList, this.parsedData.phases, civCode);
		this.parsedData.replacing = this.buildReplacing(this.parsedData.phases);
		this.parsedData.techs = this.appendPhases(this.parsedData.phases, this.parsedData.techs, civCode);
		let techList = {};
		let startList = {};
		// Get all technologies for selected civ
		for (let structCode of templateLists.structures.keys())
		{
			let structInfo = this.parsedData.structures[structCode];
			// Add technologies
			for (let prod of structInfo.production.techs)
			{
				//if (this.isPhaseTech(prod))
				//	continue;
				let same = false;
				if (!(prod in techList)) {
					techList[prod] = this.defaultTechScheme();
					techList[prod].phase = this.getPhaseOfTemplate(structInfo, civCode);
				}
				let reqs = this.getTechSupersedes(prod, civCode);
				if (reqs === false)
					continue;
				let pName = this.getPhaseOfTemplate(structInfo, civCode);
				let ptName = this.getPhaseOfTechnology(prod, civCode);
				let pId =  phaseList.indexOf(pName);
				const tech_list = techList[prod];
				// loop through all buildings and return minimum phase
				for (let b of tech_list.buildings) {
					let bs = this.parsedData.structures[b];
					pId = Math.min(pId, phaseList.indexOf(this.getPhaseOfTemplate(bs, civCode)));
				}
				pId = Math.max(pId, phaseList.indexOf(ptName));
				tech_list.phase = phaseList[pId];
				
				for (let r in reqs) {
					const req = reqs[r];
					//if (this.isPhaseTech(req))
					//	continue;
					if (!(req in techList)) {
						techList[req] = this.defaultTechScheme();
					}
					if (techList[req].unlocks.indexOf(prod) == -1)
						techList[req].unlocks.push(prod);
					if (tech_list.require.indexOf(req) == -1)
						tech_list.require.push(req);
					// do not add to structure root technology if has requirement
					// from the same building
					if (structInfo.production.techs.indexOf(req) != -1)
						same = true;
				}	
				if (tech_list.buildings.indexOf(structCode) == -1)
					tech_list.buildings.push(structCode);
				if (tech_list.require.length == 0 || !same) {
					if (!(structCode in startList)) {
						startList[structCode] = [];
					}
					if (startList[structCode].indexOf(prod) == -1)
						startList[structCode].push(prod);
					this.selectedBuilding = structCode;
					this.selectedTech = prod;
				}
				// Add phase to req
				let req = tech_list.phase;
				if (!!req) {
					if (req in this.parsedData.replacing) {
						req = this.parsedData.replacing[req];
					}
					if (!(req in techList)) {
						techList[req] = this.defaultTechScheme();
					}
					if (tech_list.require.indexOf(req) == -1)
						tech_list.require.push(req);
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
					if (this.isPhaseTech(tech))
						continue;
					if (!(tech in techList)) {
						techList[tech] = this.defaultTechScheme();
					}
					if (techList[tech].units.indexOf(prod) == -1)
						techList[tech].units.push(prod);
				}
			}
		}	
		
		this.techList[civCode] = techList;
		this.startingTechs[civCode] = startList;
		this.selectStruct(Object.keys(startList)[0]);
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
	buildReplacing(phases) {
		let data = {};
		for (let i in phases) {
			const phase = phases[i];
			if (phase.replaces !== undefined && phase.replaces.length > 0) {
				data[phase.replaces[0]] = i;
			}
		}
		return data;
	}
	appendPhases(keys, data, civCode) {
		for (let t in keys) {
			data[civCode][t] = this.loadTechnology(t, civCode);//keys[t];
		}
		/*
		warn("keys = "+uneval(keys));
		for (let t in keys) {
			let techCode = keys[t];
			if (!!techCode)
			{
				warn(uneval(techCode));
				if (basename(techCode).startsWith("phase")) {
					data[civCode][techCode] = this.loadTechnology(techCode, civCode);
				}
			}
		}
		*/
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
	 * Draw the techtree
	 *
	 * (Actually resizes and changes visibility of elements, and populates text)
	 */
	draw(civCode)
	{
		if (civCode == "")
			return;
		// Set basic state (positioning of elements mainly), but only once
		//if (!Object.keys(this.g_DrawLimits).length)
			this.predraw(civCode);

		let leftMargin = Engine.GetGUIObjectByName("tree_display").size.left;
		
		this.structRow.draw(this, civCode, this.startingTechs[civCode], this.parsedData.structures);
		//this.techRow.draw(this, civCode, this.startingTechs[civCode], this.selectedBuilding, this.parsedData, this.selectedTech);
				
		// Draw requirements
		this.reqSection.draw(this, civCode, this.techList[civCode][this.selectedTech], this.parsedData);

		this.mainSection.draw(this, civCode, this.parsedData.techs[civCode][this.selectedTech], this.parsedData.techs[civCode]);
		
		// Draw unlocks
		this.unlockSection.draw(this, civCode, this.techList[civCode][this.selectedTech], this.parsedData)
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
		const phaseList = this.parsedData.phaseList;
		const initIconSize = this.getInitIconSize();
		const leftRows = 2;
		const rowSize = initIconSize.top - initIconSize.bottom;
		
		let selectedTech = this.techList[civCode][this.selectedTech];
		let selectedTemplate = this.parsedData.techs[civCode][this.selectedTech];
		
		if (selectedTech == undefined || selectedTemplate == undefined)
			return;
		
		let pSelectedTech;
		let pSelectedTemplate;
			
		if (selectedTemplate) {
			if (selectedTemplate.paired) {
				pSelectedTech = this.techList[civCode][selectedTemplate.paired];
				pSelectedTemplate = this.parsedData.techs[civCode][selectedTemplate.paired];
			}
		}
		
		// Draw buildings
		this.structRow.predraw(civCode, this.startingTechs[civCode]);
		// Draw starting technlogies
		//this.techRow.predraw(civCode, this.startingTechs[civCode][this.selectedBuilding]);
		// Draw technologies in list
		this.listSection.predraw(civCode, this.startingTechs[civCode][this.selectedBuilding], initIconSize ,leftRows, rowSize);
		
		
		this.techSection.predraw("s", selectedTemplate, selectedTech, leftRows, rowSize, initIconSize, 0, this.parsedData);	
		this.techSection.predraw("p", pSelectedTemplate, pSelectedTech, leftRows, rowSize, initIconSize, 70, this.parsedData);
		
		let res = this.reqSection.predraw(this, 0, 0, selectedTech, civCode);
		
		let spasing = res.spasing;
		spasing = this.mainSection.predraw(spasing);
		this.unlockSection.predraw(this, 3, spasing, selectedTech);
	}
		
	setIconRowSize(thisEle, initIconSize, i, shift, row, spasing)
	{
		return this.Utils.setIconRowSize(thisEle, initIconSize, i, shift, row, spasing);
	}
	setBottomTopSize(size, initIconSize, row, rowSize, spasing)
	{
		return this.Utils.setBottomTopSize(size, initIconSize, row, rowSize, spasing);
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
		return this.TemplateParser.getPhaseOfTechnology(techName, civCode);
	}

	getTechSupersedes(techName, civCode)
	{
		const isPhase = this.isPhaseTech(techName);
		/*
		if (isPhase)
		{
			if (!this.parsedData.phases[techName].superseded)
				return false;

			phaseIdx = this.parsedData.phaseList.indexOf(this.getActualPhase(techName));
			if (phaseIdx > 0)
				return this.parsedData.phaseList[phaseIdx - 1];
		}
		*/
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
			if ((!this.isPhaseTech(supers) || isPhase) && !basename(supers).startsWith("pair"))
				req.push(supers);
		}
		for (let option of techReqs) {
			if (!!option.techs) {
				for (let tech of option.techs) {
					if (this.isPhaseTech(tech) && !isPhase)
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
		return this.TemplateParser.getActualPhase(phaseName);
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

		if (this.isPhaseTech(template.requiredTechnology))
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
		let parsed = GetTemplateDataHelper(template, null, this.auraData, this.resourceData, modifiers);
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
		let tech = GetTechnologyDataHelper(template, civCode, this.resourceData);
		tech.name.internal = techName;
		tech.supersedes = template.supersedes;

		if (template.pair !== undefined)
		{
			tech.pair = template.pair;
			const pairInfo = this.loadTechnologyPair(template.pair, civCode);
			tech.paired = pairInfo.techs[0];
			if (techName == pairInfo.techs[0])
				tech.paired = pairInfo.techs[1];
			tech.reqs = this.mergeRequirements(tech.reqs, pairInfo.reqs);
		}

		return tech;
	}
	loadTechnologyPair(pairCode, civCode)
	{
		const pairInfo = this.loadTechData(pairCode);

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
	getActualUpgradeData(upgradesInfo, civCode)
	{
		return this.TemplateParser.getActualUpgradeData(upgradesInfo, civCode);
	}
	loadTechnologyTemplate(templateName)
	{
		let data = Engine.ReadJSONFile(this.technologyPath + templateName + ".json");
		translateObjectKeys(data, this.TechKeys);

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
		if (!(templateName in this.templateData))
		{
			// We need to clone the template because we want to perform some translations.
			let data = clone(Engine.GetTemplate(templateName));
			translateObjectKeys(data, this.TemplateKeys);

			if (data.Auras)
				for (let auraID of data.Auras._string.split(/\s+/))
					this.loadAuraData(auraID);

			if (data.Identity.Civ != "gaia" && civCode != "gaia" && data.Identity.Civ != civCode)
				warn("The \"" + templateName + "\" template has a defined civ of \"" + data.Identity.Civ + "\". " +
					"This does not match the currently selected civ \"" + civCode + "\".");

			this.templateData[templateName] = data;
		}

		return this.templateData[templateName];
	}
	loadAuraData(templateName)
	{
		if (!(templateName in this.auraData))
		{
			let data = Engine.ReadJSONFile(this.auraPath + templateName + ".json");
			translateObjectKeys(data, this.AuraKeys);

			this.auraData[templateName] = data;
		}

		return this.auraData[templateName];
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

		for (let filename of Engine.ListDirectoryFiles(this.technologyPath, "*.json", true))
		{
			// -5 to strip off the file extension
			let templateName = filename.slice(this.technologyPath.length, -5);
			let data = this.loadTechData(templateName);

			if (data && data.autoResearch)
				techList.push(templateName);
		}

		return techList;
	}
	loadTechData(templateName)
	{
		if (!(templateName in this.technologyData))
		{
			let data = Engine.ReadJSONFile(this.technologyPath + templateName + ".json");
			translateObjectKeys(data, this.TechKeys);

			this.technologyData[templateName] = data;
		}

		return this.technologyData[templateName];
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
	defaultTechScheme() {
		return {
			"require": [],
			"unlocks": [],
			"buildings": [],
			"units": [],
			"phase": "phase_village"
		};
	}
	getInitIconSize() {
		return this.Utils.getInitIconSize();
	}
}

TechtreePage.prototype.CloseButtonTooltip =
	translate("%(hotkey)s: Close Technology Tree.");

// Gap between the `TreeSection` and `TrainerSection` gui objects (when the latter is visible)
TechtreePage.prototype.SectionGap = 12;

// Margin around the edge of the structree on lower resolutions,
// preventing the UI from being clipped by the edges of the screen.
TechtreePage.prototype.BorderMargin = 16;
TechtreePage.prototype.IconPath = "stretched:session/portraits/";
TechtreePage.prototype.auraPath = "simulation/data/auras/";
TechtreePage.prototype.technologyPath = "simulation/data/technologies/";
TechtreePage.prototype.TechKeys = ["genericName", "tooltip", "description"];
TechtreePage.prototype.TemplateKeys = ["GenericName", "SpecificName", "Tooltip", "History"];
TechtreePage.prototype.AuraKeys = ["auraName", "auraDescription"];
TechtreePage.prototype.FontType = '[font="sans-bold-16"]';
TechtreePage.prototype.maxItems = 30;