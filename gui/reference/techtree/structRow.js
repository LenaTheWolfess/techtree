class StructRow extends TechtreeUtils
{
	constructor()
	{
		super()
	}
	predraw(civCode, techs)
	{	
		const initIconSize = this.getInitIconSize();
		const rowSize = initIconSize.top - initIconSize.bottom;
		let shift = 0;
		for (let sc in techs)
			shift++;
		shift = shift / 2;
		let i = 0;
		for (let sc in techs)
		{
			let thisEle = Engine.GetGUIObjectByName("struct["+i+"]_icon");
			if (thisEle === undefined)
			{
				error("\""+civCode+"\" has more starting buildings than can be supported by the current GUI layout");
				break;
			}
			this.setIconRowSize(thisEle, initIconSize, i, shift, this.row, this.spasing);
			++i;
		}
		Engine.GetGUIObjectByName("struct_row").size = "0 0 100% " + (initIconSize.bottom - (this.row * rowSize) + 2 * this.spasing);
		for (let x = i; x < this.maxItems; ++x) {
			Engine.GetGUIObjectByName("struct["+x+"]_icon").hidden = true;
		}
	}
	draw(page, civCode, techs, structures)
	{
		let i = 0;
		for (let structCode in techs)
		{
			const thisEle = Engine.GetGUIObjectByName("struct["+i+"]_icon");
			if (thisEle === undefined)
			{
				error("\""+civCode+"\" has more starting buildings than can be supported by the current GUI layout");
				break;
			}
			const struct = structures[structCode];
			if (!struct) {
				warn("structure " + structCode + " is not in parsed data");
				continue;
			}
			const grayscale = page.selectedBuilding == structCode ? "" : "grayscale:";
			thisEle.sprite = "stretched:"+grayscale+"session/portraits/"+struct.icon;
			thisEle.tooltip =  this.FontType + struct.name.generic + '[/font]\n(' + struct.name.specific+")";
			const that = page;
			thisEle.onPress = function() {
				that.selectStruct(structCode);
				that.draw(civCode);
			}
			++i;
		}
	}
};
StructRow.prototype.row = 0;