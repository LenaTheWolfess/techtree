class TechRow extends TechtreeUtils
{
	constructor()
	{
		super()
	}
	predraw(civCode, techs)
	{	
		if (!techs)
			return;
		const initIconSize = this.getInitIconSize();
		const rowSize = initIconSize.top - initIconSize.bottom;
		let shift = techs.length / 2;
		let i = 0;
		for (let sc in techs)
		{
			let thisEle = Engine.GetGUIObjectByName("tech["+i+"]_icon");
			if (thisEle === undefined)
			{
				error("\""+civCode+"\" has more starting techs than can be supported by the current GUI layout");
				break;
			}
			this.setIconRowSize(thisEle, initIconSize, i, shift, this.row, this.spasing);
			++i;
		}
		Engine.GetGUIObjectByName("start_row").size = "0 "+((initIconSize.top) - ((this.row + 1) * rowSize) + 2 * this.spasing)+" 100% " + (initIconSize.bottom - ((this.row + 1) * rowSize) + 4 * this.spasing);
		for (let x = i; x < this.maxItems; ++x) {
			Engine.GetGUIObjectByName("tech["+x+"]_icon").hidden = true;
		}
	}
	draw(page, civCode, techs, structure, data, selected)
	{
		if (!techs || !techs[structure])
			return;
		let i = 0;
		for (let techCode of techs[structure])
		{
			const thisEle = Engine.GetGUIObjectByName("tech["+i+"]_icon");
			if (thisEle === undefined)
			{
				error("\"" + civCode + "\" has more starting techs than can be supported by the current GUI layout");
				break;
			}
			let tech = data.techs[civCode][techCode];
			if (techCode.startsWith("phase")) {
				tech = data.phases[techCode];
			}
			let startTechIcon = Engine.GetGUIObjectByName("tech["+i+"]_icon");
			
			const grayscale = selected == techCode ? "" : "grayscale:";
			startTechIcon.sprite = "stretched:"+grayscale+"session/portraits/"+tech.icon;
			startTechIcon.tooltip = this.FontType + tech.name.generic+ '[/font]\n'+ tech.description;
			let that = page;
			startTechIcon.onPress = function() {
				that.selectTech(tech.name.internal);
				that.draw(civCode);
			}
			++i;
		}
	}
};
TechRow.prototype.row = 0;