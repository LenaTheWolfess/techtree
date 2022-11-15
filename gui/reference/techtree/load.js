/**
 * Paths to certain files.
 */
const g_TechnologyPath = "simulation/data/technologies/";
const g_AuraPath = "simulation/data/auras/";

/**
 * Raw Data Caches.
 */
var g_AuraData = {};
var g_TemplateData = {};
var g_TechnologyData = {};
var g_CivData = loadCivData(true, false);
var g_TechnologyTranslateKeys = ["genericName", "tooltip", "description"];

/**
 * Parsed Data Stores.
 */
var g_ParsedData = {};
var g_ResourceData = new Resources();
//var g_DamageTypes = new DamageTypes();

// This must be defined after the g_TechnologyData cache object is declared.
//var g_AutoResearchTechList = findAllAutoResearchedTechs();

/**
 * Loads raw entity template.
 *
 * Loads from local cache if data present, else from file system.
 *
 * @param {string} templateName
 * @return {object} Object containing raw template data.
 */
function loadTemplate(templateName, civCode)
{
	if (!(templateName in g_TemplateData))
	{
		// We need to clone the template because we want to perform some translations.
		let data = clone(Engine.GetTemplate(templateName));
		translateObjectKeys(data, ["GenericName", "SpecificName", "Tooltip", "History"]);

		if (data.Auras)
			for (let auraID of data.Auras._string.split(/\s+/))
				loadAuraData(auraID);

		if (data.Identity.Civ != "gaia" && civCode != "gaia" && data.Identity.Civ != civCode)
			warn("The \"" + templateName + "\" template has a defined civ of \"" + data.Identity.Civ + "\". " +
				"This does not match the currently selected civ \"" + civCode + "\".");

		g_TemplateData[templateName] = data;
	}

	return g_TemplateData[templateName];
}

/**
 * Loads raw technology template.
 *
 * Loads from local cache if available, else from file system.
 *
 * @param {string} templateName
 * @return {object} Object containing raw template data.
 */
function loadTechData(templateName)
{
	if (!(templateName in g_TechnologyData))
	{
		let data = Engine.ReadJSONFile(g_TechnologyPath + templateName + ".json");
		translateObjectKeys(data, ["genericName", "tooltip", "description"]);

		g_TechnologyData[templateName] = data;
	}

	return g_TechnologyData[templateName];
}

function techDataExists(templateName)
{
	return Engine.FileExists("simulation/data/technologies/" + templateName + ".json");
}

/**
 * Loads raw aura template.
 *
 * Loads from local cache if available, else from file system.
 *
 * @param {string} templateName
 * @return {object} Object containing raw template data.
 */
function loadAuraData(templateName)
{
	if (!(templateName in g_AuraData))
	{
		let data = Engine.ReadJSONFile(g_AuraPath + templateName + ".json");
		translateObjectKeys(data, ["auraName", "auraDescription"]);

		g_AuraData[templateName] = data;
	}

	return g_AuraData[templateName];
}

function loadProductionQueue(template, civCode)
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
		const technology = loadTechnologyTemplate(technologyName, civCode);
		if (DeriveTechnologyRequirements(technology, civCode))
			production.techs.push(technologyName);
	};

	if (template.Researcher?.Technologies?._string) {
		for (let technologyName of template.Researcher.Technologies._string.split(" ")) {
			if (technologyName.indexOf("{civ}") != -1) {
				const civTechName = technologyName.replace("{civ}", civCode);
				technologyName = TechnologyTemplateExists(civTechName) ? civTechName : technologyName.replace("{civ}", "generic");
			}

			if (isPairTech(technologyName)) {
				let technologyPair = loadTechnologyPairTemplate(technologyName, civCode);
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
function loadTechnologyTemplate(templateName)
{
	let data = Engine.ReadJSONFile(g_TechnologyPath + templateName + ".json");
	translateObjectKeys(data, g_TechnologyTranslateKeys);

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

/**
 * @param {string} templateName
 * @param {string} civCode
 * @return {Object} Contains a list and the requirements of the techs in the pair
 */
function loadTechnologyPairTemplate(templateName, civCode)
{
	let template = loadTechnologyTemplate(templateName);
	return {
		"techs": [template.top, template.bottom],
		"reqs": DeriveTechnologyRequirements(template, civCode)
	};
}
function isPairTech(technologyCode)
{
	return !!loadTechnologyTemplate(technologyCode).top;
}

function loadBuildQueue(template, civCode)
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
	
function getActualUpgradeData(upgradesInfo, selectedCiv)
{
	let newUpgrades = [];
	for (let upgrade of upgradesInfo)
	{
		upgrade.entity = upgrade.entity.replace(/\{(civ|native)\}/g, selectedCiv);

		let data = GetTemplateDataHelper(loadTemplate(upgrade.entity, selectedCiv), null, g_AuraData, g_ResourceData);
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
 * Load and parse a structure, unit, resource, etc from its entity template file.
 *
 * @return {(object|null)} Sanitized object about the requested template or null if entity template doesn't exist.
 */
function loadEntityTemplate(templateName, civCode, modifiers)
{
	if (!Engine.TemplateExists(templateName))
		return null;

	let template = loadTemplate(templateName, civCode);
	let parsed = GetTemplateDataHelper(template, null, g_AuraData, g_ResourceData, modifiers);
	parsed.name.internal = templateName;

	parsed.history = template.Identity.History;

	parsed.production = loadProductionQueue(template, civCode);
	if (template.Builder)
		parsed.builder = loadBuildQueue(template, civCode);

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
		parsed.upgrades = getActualUpgradeData(parsed.upgrades, civCode);

	if (parsed.wallSet)
	{
		parsed.wallset = {};

		if (!parsed.upgrades)
			parsed.upgrades = [];

		// Note: An assumption is made here that wall segments all have the same armor and auras
		let struct = loadEntityTemplate(parsed.wallSet.templates.long, civCode);
		parsed.armour = struct.armour;
		parsed.auras = struct.auras;

		// For technology cost multiplier, we need to use the tower
		struct = loadEntityTemplate(parsed.wallSet.templates.tower, civCode);
		parsed.techCostMultiplier = struct.techCostMultiplier;

		let health;

		for (let wSegm in parsed.wallSet.templates)
		{
			if (wSegm == "fort" || wSegm == "curves")
				continue;

			let wPart = loadEntityTemplate(parsed.wallSet.templates[wSegm], civCode);
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
				let wPart = loadEntityTemplate(curve, civCode);
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

function mergeRequirements(reqsA, reqsB)
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

/**
 * Load and parse technology from json template.
 *
 * @param {string} templateName
 * @return {object} Sanitized data about the requested technology.
 */
function loadTechnology(techName, civCode)
{
	if (civCode == undefined)
		error("loadTechnology("+techName + ", undefined)")
	let template = loadTechData(techName);
	let tech = GetTechnologyDataHelper(template, civCode, g_ResourceData);
	tech.name.internal = techName;
	tech.supersedes = template.supersedes;

	if (template.pair !== undefined)
	{
		tech.pair = template.pair;
		let pairInfo = loadTechnologyPair(template.pair, civCode);
		tech.paired = pairInfo.techs[0];
		if (techName == pairInfo.techs[0])
			tech.paired = pairInfo.techs[1];
		tech.reqs = mergeRequirements(tech.reqs, pairInfo.reqs);
	}

	return tech;
}

/**
 * Crudely iterates through every tech JSON file and identifies those
 * that are auto-researched.
 *
 * @return {array} List of techs that are researched automatically
 */
function findAllAutoResearchedTechs()
{
	let techList = [];

	for (let filename of Engine.ListDirectoryFiles(g_TechnologyPath, "*.json", true))
	{
		// -5 to strip off the file extension
		let templateName = filename.slice(g_TechnologyPath.length, -5);
		let data = loadTechData(templateName);

		if (data && data.autoResearch)
			techList.push(templateName);
	}

	return techList;
}

/**
 * @param {string} phaseCode
 * @return {object} Sanitized object containing phase data
 */
function loadPhase(phaseCode, civCode)
{
	let phase = loadTechnology(phaseCode, civCode);

	phase.actualPhase = phaseCode;
	if (phase.replaces !== undefined)
		phase.actualPhase = phase.replaces[0];

	return phase;
}

/**
 * @param {string} pairCode
 * @return {object} Contains a list and the requirements of the techs in the pair
 */
function loadTechnologyPair(pairCode, civCode)
{
	var pairInfo = loadTechData(pairCode);

	return {
		"techs": [ pairInfo.top, pairInfo.bottom ],
		"reqs": DeriveTechnologyRequirements(pairInfo, civCode)
	};
}

/**
 * @param {string} modCode
 * @return {object} Sanitized object containing modifier tech data
 */
function loadModifierTech(modCode)
{
	if (!Engine.FileExists("simulation/data/technologies/"+modCode+".json"))
		return {};
	return loadTechData(modCode);
}
