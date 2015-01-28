<?php $title='Echo server'; include(__DIR__ . '/../mall/header.php'); ?>
<div id='flash'>

<div id="tankgame">
	<canvas id='canvas1'>
	  Your browser does not support the element HTML5 Canvas.
	</canvas>
</div>

<h1>Multiplayerspelet Tanko</h1>
<p>Utmana en spelare genom att högerklicka på användaren i chattlistan.</p>

<select id="url">
    <option value="ws://nodejs1.student.bth.se:8115">nodejs</option>
    <option value="ws://localhost:1337" selected="selected">Localhost</option>
</select>
 <input id='nickname' type='text' placeholder='Choose username'/>
    
<button id='connect'>Connect</button>
<button id='disconnect'>Disconnect</button>

</div>
<?php $path=__DIR__; include(__DIR__ . '/../mall/footer.php'); ?>


<script src="main.js"></script>
<script src="tankgame.js"></script>





