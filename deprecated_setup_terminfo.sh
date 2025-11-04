# This was used for trying to combat some specific issues,  this specific terminfo will not work very nicely
# Deprecated now.
mkdir -p ~/.terminfo/n/
cat > ~/.terminfo/n/neobrowse << 'EOF'
neobrowse|terminal for neobrowse utility,
	am, bw, msgr, xenl, xon,
	colors#256, cols#80, lines#24,
	bel=^G, blink=\E[5m, bold=\E[1m, clear=\E[H\E[J,
	cr=\r, cub=\E[%p1%dD, cub1=\E[D,
	cud=\E[%p1%dB, cud1=\E[B,
	cuf=\E[%p1%dC, cuf1=\E[C,
	cup=\E[%i%p1%d;%p2%dH,
	cuu=\E[%p1%dA, cuu1=\E[A,
	dch=\E[%p1%dP, dch1=\E[P,
	dl=\E[%p1%dM, dl1=\E[M,
	ech=\E[%p1%dX, ed=\E[J, el=\E[K,
	home=\E[H, ht=\t, hts=\EH, ich=\E[%p1%d@, ich1=\E[@,
	il=\E[%p1%dL, il1=\E[L, ind=\n, is2=\E[!p\E[?3;4l\E[4l\E>,
	kbs=\b, kcub1=\EOD, kcud1=\EOB, kcuf1=\EOC, kcuu1=\EOA,
	kdch1=\E[3~, kend=\E[4~, khome=\E[1~, knp=\E[6~, kpp=\E[5~,
	rc=\E8, rev=\E[7m, ri=\EM, rmacs=\E[10m, rmam=\E[?7l,
	rmkx=\E[?1l\E>, rmso=\E[27m, rmul=\E[24m, rs2=\E[!p\E[?3;4l\E[4l\E>,
	sc=\E7, sgr=\E[0;10m, sgr0=\E[0;10m, smacs=\E[11m,
	smam=\E[?7h, smkx=\E[?1h\E=, smso=\E[7m, smul=\E[4m,
	setab=\E[4%p1%dm, setaf=\E[3%p1%dm,
EOF
tic ~/.terminfo/n/neobrowse
